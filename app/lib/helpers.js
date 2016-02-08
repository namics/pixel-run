exports = module.exports = function(handlebars) {
    handlebars.registerHelper('each', function(context, options) {
        var ret = '';

        for(var i = 0, j = context.length; i < j; i++) {
            ret += options.fn(context[i]);
        }

        return ret;
    });

    handlebars.registerHelper('debug', function(optionalValue) {
        console.log('Current Context');
        console.log('====================');
        console.log(this);

        if (optionalValue) {
            console.log('Value');
            console.log('====================');
            console.log(optionalValue);
        }
    });

    handlebars.registerHelper('json', function(context) {
        return JSON.stringify(context);
    });
}
