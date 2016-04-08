"use strict";
var fs = require('fs-extra');
var _ = require('lodash');
var NGDependencyInjector_1 = require("./NGDependencyInjector");
var Placeholder_1 = require("../../../core/Placeholder");
var TSFileGen_1 = require("../../../core/TSFileGen");
var Util_1 = require("../../../../util/Util");
var NGFilterGen = (function () {
    function NGFilterGen(config) {
        this.path = 'src/app/filter';
        if (/.+filter$/i.exec(config.name)) {
            config.name = config.name.replace(/filter$/i, '');
        }
        var rawName = _.camelCase(config.name);
        this.file = new TSFileGen_1.TsFileGen(rawName + 'Filter');
        this.method = this.file.addMethod(this.file.name);
        this.method.shouldExport(true);
        this.method.setContent("return (input: string, ...args: Array<string>):string => {\n            return input;\n        }");
        this.file.addMixin(this.file.name + ".$inject = [];", TSFileGen_1.TsFileGen.CodeLocation.AfterMethod);
        Util_1.Util.fs.mkdir(this.path);
    }
    NGFilterGen.prototype.generate = function () {
        var tplPath = 'src/templates/filter';
        try {
            fs.mkdirSync(tplPath);
        }
        catch (e) {
        }
        NGDependencyInjector_1.NGDependencyInjector.updateImportAndAppFile(this.file, 'filter', this.path, Placeholder_1.Placeholder.NGFilter, '../filter');
    };
    NGFilterGen.getGeneratorConfig = function (cb) {
        cb({});
    };
    return NGFilterGen;
}());
exports.NGFilterGen = NGFilterGen;
