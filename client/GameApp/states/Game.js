import $ from "jquery";
import store from "../redux/store";
import settings from "../settings";
import {
  addCursors,
  addSound,
  addTilemapLayer,
  addBackground,
  addPlayerToCurrentPlayers,
  addPlayer,
  updateTextOfACurrentPlayer,
  toggleGameState
} from "../redux/actions";
import Util, { Debugger } from "../provider/Util";
import Sprite from "../classes/Sprite";
import ScoreText from "../classes/ScoreText";
import Tilemap from "../classes/Tilemap";
import Player from "../classes/Player";

const PLAYER_OFFSET_X = 500;
const PLAYER_OFFSET_Y = 300;


class Game {
  create() {
    // Loading all audio effects
    this.$createAudioFX();

    // Adding background image
    this.$createBackground();

    // Instanciate the tilemap
    this.$createTilemap();

    // Create cursor keys for all players
    store.dispatch(addCursors(this.input.keyboard.createCursorKeys()));

    // Create sessions and score texts for the players
    this.$createScoreTexts();

    // Create players set in settings file under /app
    this.$createPlayers();

    // Follow the first player with the camera
    this.camera.follow(Game.$furthestPlayer().player);

    // Add emergency handlers in window
    this.$applyEmergency();
  }

  update() {
    if (this.skipUpdateLoop) {
      return;
    }

    const { currentPlayers } = store.getState();
    const aliveCurrentPlayers = currentPlayers.filter(
      p => p.player().dead === false
    );
    const players = currentPlayers.map(p => p.player());

    // Follow the first player if the first player dies etc.
    this.camera.follow(Game.$furthestPlayer(players).player);

    const alivePlayers = Game.$getAlivePlayers(players);

    if (alivePlayers.length === 0 && !this.finished) {
      // Quit the game if no players are alive
      store.dispatch(toggleGameState());
      this.exit();
      return;
    } else if (alivePlayers.length === 1) {
      // TODO: If just one player is alive and he/she is blocked
      // by an obstacle by more than 5 seconds, the game should end!
      // Tipp: Player.body.blocked.right && Player.body.blocked.down
    }

    aliveCurrentPlayers.forEach(currentPlayer => {
      const player = currentPlayer.player();

      // Let the players collide with the tilemap
      store
        .getState()
        .game.physics.arcade.collide(player, store.getState().tilemapLayer);

      // Update the score text with the current position
      currentPlayer.text.set(Util.calculate.score(player.x));
      store.dispatch(
        updateTextOfACurrentPlayer(currentPlayer.id, currentPlayer.text)
      );

      // Run update and jump detection/loops if the player
      // is alive and not already dead
      if (player.dead !== true) {
        player.$update();
        player.run();
      } else {
        player.$updateText();
      }
    });
  }

  /**
   * Finishes the game
   */
  exit() {
    this.skipUpdateLoop = true;
    store.getState().game.lockRender = true;
    // clearStage and clearCache params
    store.getState().game.state.start("Over", true, true, this);
  }

  /**
   * Gets all players which are still alive
   * @return {Array}          Alive players
   */
  static $getAlivePlayers(players = store.getState().players) {
    const alive = [];
    players.forEach(player => {
      if (player.alive === true) {
        alive.push(player);
      }
    });
    return alive;
  }

  /**
   * Get the furthest player in game, used for the camera
   * following procedure.
   * @return {Object}         Player and position
   */
  static $furthestPlayer(players = store.getState().players) {
    let firstPlayer = players[0];
    let posFirst = players[0].x;

    players.forEach(player => {
      if (player.x > posFirst) {
        posFirst = player.x;
        firstPlayer = player;
      }
    });

    return {
      player: firstPlayer,
      position: posFirst
    };
  }

  /**
   * Creates all audio FX nodes and inject it to the Audio Container
   */
  $createAudioFX() {
    const fxSounds = settings.audio.fx;

    fxSounds.forEach(fxSound => {
      store.dispatch(
        addSound({
          name: fxSound,
          node: this.add.audio(`fx-${fxSound}`),
          play() {
            store
              .getState()
              .audio.find(a => a.name === fxSound)
              .node.restart();
          }
        })
      );
    });
  }

  /**
   * Creates a session for a single player with the needed
   * properties and references to the name, ID, color and the
   * Phaser Player itself.
   * @param  {String} name        Player name
   * @param  {Number} pid         Player ID
   * @return {Object}             Session Player
   */
  static $createPlayerSession(username, realname, pid) {
    const { worlds } = settings;
    const wtype = store.getState().world;

    const newPlayerSession = {
      id: pid,
      name: realname,
      username,
      color: worlds.find(w => w.name === wtype).colors[pid],
      // TODO access players properly
      image() {
        return `${store.getState().players.find(p => p.id === pid).key}.png`;
      },
      player() {
        return store.getState().players.find(p => p.id === pid);
      },
      text: "",
      score: ""
    };

    store.dispatch(addPlayerToCurrentPlayers(newPlayerSession));
    return newPlayerSession;
  }

  /**
   * Creates the score texts for each player. Before that,
   * it will create a session for every player.
   */
  $createScoreTexts() {
    let pid = 0;
    const players = store.getState().playerNames.filter(p => p !== "");

    players.forEach(name => {
      const trimmedName = name.trim();
      const username = trimmedName.replace(" ", "");
      Game.$createPlayerSession(username, trimmedName, pid);

      const text = new ScoreText(this, username.toUpperCase(), 0);
      text.option("fontSize", `${settings.render.fontSize}px`);
      text.option(
        "fill",
        store.getState().currentPlayers.find(p => p.name === username).color
      );
      text.add(20, (settings.render.fontSize + 5) * (pid + 1), true);

      store.dispatch(updateTextOfACurrentPlayer(pid, text));

      pid += 1;
    });
  }

  /**
   * Creates the background layer for current world type
   */
  $createBackground() {
    const background = new Sprite(this, `background-${store.getState().world}`);
    store.dispatch(addBackground(background));
    background.setScaleMinMax(1, 1, 1, 1);
    background.add(0, 0);
  }

  /**
   * Creates the tilemap and layers for the current world type
   */
  $createTilemap() {
    const worldType = store.getState().world;
    // Create a new tilemap with the worldType
    const map = new Tilemap(this, `tilemap-${worldType}`);
    map.addToGame(this);
    map.addImage(`tile-${worldType}`, `tile-${worldType}`);

    // Create the ground and platform layers named 'world'
    const layer = map.createLayer("world");

    // Add collision detection and resize the game to layer size
    map.setCollision("world", 0, 5000);
    map.resize("world");

    store.dispatch(addTilemapLayer(layer));
  }

  /**
   * Create players defined in the global settings
   * @param  {Function} callback      Callback handler
   * @return {*}                      Callback return value
   */
  $createPlayers() {
    const pheight = settings.game.players.height;
    const pwidth = settings.game.players.width;

    // Create players for the amount defined in settings.players
    // TODO beautify filter method
    for (
      let i = 0;
      i < store.getState().playerNames.filter(p => p !== "").length;
      i += 1
    ) {
      const instance = new Player(
        this,
        i,
        PLAYER_OFFSET_X + (pwidth + 70) * i,
        PLAYER_OFFSET_Y + pheight
      );
      instance.init();
      store.dispatch(addPlayer(instance));
    }
  }

  $applyEmergency() {
    let res = false;

    /**
     * Wrapper for the window.confirm method
     * @param  {String} text        Confirm message
     * @param  {Function} handler   Callback on confirmed
     * @return {*}                  Handler return value
     */
    const confirm = (text, handler) => {
      res = window.confirm(text);
      if (res === true) {
        handler();
        this.exit();
        return;
      }
      Debugger.log("User canceled emergency action");
    };

    class Emergency {
      /**
       * Exits the game manually, if somethings lags around
       * or is buggy that you have to quit.
       */
      static $quit() {
        confirm("Are you sure to emergency quit the game?", () => {
          store.dispatch(toggleGameState());
          Emergency.$killAll();
        });
      }

      /**
       * Kills all players which are in the game
       */
      static $killAll() {
        confirm("Are you sure you want to kill every player?", () => {
          store.getState().players.forEach(player => {
            // Let each player die if not dead
            if (!player.dead) {
              player.die();
            }
          });
        });
      }
    }

    // Quit game on Ctrl + Y keypress
    $(document).on("keypress", ev => {
      if (ev.ctrlKey && ev.which === 25) {
        Emergency.$quit();
      }
    });
  }
}

export default Game;
