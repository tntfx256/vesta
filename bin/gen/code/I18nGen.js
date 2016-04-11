"use strict";
var _ = require("lodash");
var Util_1 = require("../../util/Util");
var I18nGen = (function () {
    function I18nGen(config) {
        this.config = config;
    }
    I18nGen.getGeneratorConfig = function (appConfig) {
        return Util_1.Util.prompt({ type: 'confirm', name: 'enableI18n', message: 'Enable I18N support: ' })
            .then(function (answer) {
            if (!answer['enableI18n'])
                return appConfig;
            return Util_1.Util.prompt([
                { type: 'input', name: 'locales', message: 'Locales: ' },
                { type: 'confirm', name: 'useOnModel', message: 'Use on Models: ' }
            ]);
        })
            .then(function (answer) {
            var locales = answer['locales'].split(',');
            if (!locales.length)
                return appConfig;
            for (var i = locales.length; i--;) {
                locales[i] = _.trim(locales[i]);
                if (!/[a-z]{2}\-[A-Z]{2}/.exec(locales[i])) {
                    Util_1.Util.log.error("Invalid locale '" + locales[i] + "'");
                }
            }
            appConfig.i18n = {
                locales: locales,
                default: locales[0],
                useMultilingualModel: answer['useOnModel']
            };
            return appConfig;
        });
    };
    return I18nGen;
}());
exports.I18nGen = I18nGen;
