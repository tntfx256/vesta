"use strict";
var ClassGen_1 = require("../core/ClassGen");
var DatabaseGen_1 = require("../core/DatabaseGen");
var Placeholder_1 = require("../core/Placeholder");
var TSFileGen_1 = require("../core/TSFileGen");
var ApiFactoryGen = (function () {
    function ApiFactoryGen(config) {
        this.config = config;
        this.factoryFile = new TSFileGen_1.TsFileGen('ApiFactory');
        this.factoryClass = this.factoryFile.addClass();
        this.factoryFile.addImport('{Router}', 'express');
        this.factoryFile.addImport('{BaseController}', './BaseController');
        this.createMethod();
        this.loaderMethod();
    }
    ApiFactoryGen.prototype.createMethod = function () {
        var method = this.factoryClass.addMethod('create', ClassGen_1.ClassGen.Access.Public, true);
        method.addParameter({ name: 'version', type: 'string' });
        method.addParameter({ name: 'setting' });
        var db = DatabaseGen_1.DatabaseGen.getDatabaseType(this.config.server.database);
        this.factoryFile.addImport(db.import, db.from);
        method.addParameter({ name: 'database', type: db.type });
        method.setReturnType('Router');
        method.setContent("var apiRouter = Router();\n        var controllerRouter = ApiFactory.manualLoadControllers(setting, database);\n        return apiRouter.use('/api/' + version, controllerRouter);");
    };
    ApiFactoryGen.prototype.loaderMethod = function () {
        var method = this.factoryClass.addMethod('manualLoadControllers', ClassGen_1.ClassGen.Access.Private, true);
        method.addParameter({ name: 'setting' });
        var db = DatabaseGen_1.DatabaseGen.getDatabaseType(this.config.server.database);
        this.factoryFile.addImport(db.import, db.from);
        method.addParameter({ name: 'database', type: db.type });
        method.setReturnType('Router');
        method.setContent("var router: Router = Router();\n        " + Placeholder_1.Placeholder.Router + "\n        return router;");
    };
    ApiFactoryGen.prototype.generate = function () {
        return this.factoryFile.generate();
    };
    return ApiFactoryGen;
}());
exports.ApiFactoryGen = ApiFactoryGen;
