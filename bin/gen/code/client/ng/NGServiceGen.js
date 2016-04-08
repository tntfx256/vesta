"use strict";
var fs = require('fs-extra');
var _ = require('lodash');
var NGDependencyInjector_1 = require("./NGDependencyInjector");
var Placeholder_1 = require("../../../core/Placeholder");
var TSFileGen_1 = require("../../../core/TSFileGen");
var NGServiceGen = (function () {
    function NGServiceGen(config) {
        this.config = config;
        this.path = 'src/app/service';
        if (/.+service$/i.exec(config.name)) {
            config.name = config.name.replace(/service$/i, '');
        }
        var rawName = _.camelCase(config.name) + 'Service';
        this.serviceFile = new TSFileGen_1.TsFileGen(_.capitalize(rawName));
        this.serviceClass = this.serviceFile.addClass();
        this.serviceClass.setConstructor();
        try {
            fs.mkdirpSync(this.path);
        }
        catch (e) {
        }
    }
    NGServiceGen.prototype.generate = function () {
        NGDependencyInjector_1.NGDependencyInjector.inject(this.serviceFile, this.config.injects, this.path);
        NGDependencyInjector_1.NGDependencyInjector.updateImportAndAppFile(this.serviceFile, 'service', this.path, Placeholder_1.Placeholder.NGService, '../service');
    };
    NGServiceGen.getGeneratorConfig = function (callback) {
        var config = {};
        NGDependencyInjector_1.NGDependencyInjector.getCliInjectables()
            .then(function (injectables) {
            config.injects = injectables;
            callback(config);
        });
    };
    return NGServiceGen;
}());
exports.NGServiceGen = NGServiceGen;
