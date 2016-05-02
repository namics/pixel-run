module.exports = function (shipit) {
    'use strict';

    require('shipit-deploy')(shipit);

    let config = require('./deploy.json');

    shipit.initConfig({
        default: {
            branch: config.branch,
            workspace: config.workspace,
            deployTo: config.destination,
            repositoryUrl: config.repository,
            ignores: config.ignore,
            keepReleases: 3,
            shallowClone: true
        },
        production: {
            servers: `${config.username}@${config.hostname}`
        }
    });
};
