"use strict";
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var inquirer = require("inquirer");
var ClassGen_1 = require("../../core/ClassGen");
var TSFileGen_1 = require("../../core/TSFileGen");
var Vesta_1 = require("../../file/Vesta");
var Util_1 = require("../../../util/Util");
var DatabaseCodeGen_1 = require("./DatabaseCodeGen");
var Placeholder_1 = require("../../core/Placeholder");
var ModelGen_1 = require("../ModelGen");
var FsUtil_1 = require("../../../util/FsUtil");
var Log_1 = require("../../../util/Log");
var ExpressControllerGen = (function () {
    function ExpressControllerGen(config) {
        this.config = config;
        this.path = 'src/api';
        this.routingPath = '/';
        this.vesta = Vesta_1.Vesta.getInstance();
        this.init(this.vesta.getVersion().api);
    }
    ExpressControllerGen.prototype.init = function (version) {
        if (!version) {
            return Log_1.Log.error('Unable to obtain the API version!');
        }
        this.apiVersion = version;
        this.path = path.join(this.path, version, 'controller', this.config.route);
        this.rawName = _.camelCase(this.config.name);
        var controllerName = _.capitalize(this.rawName) + 'Controller';
        this.normalizeRoutingPath();
        this.controllerFile = new TSFileGen_1.TsFileGen(controllerName);
        this.controllerClass = this.controllerFile.addClass();
        this.controllerFile.addImport('{Request, Response, Router}', 'express');
        this.controllerFile.addImport('{BaseController}', Util_1.Util.genRelativePath(this.path, 'src/api/BaseController'));
        this.controllerClass.setParentClass('BaseController');
        this.routeMethod = this.controllerClass.addMethod('route');
        this.routeMethod.addParameter({ name: 'router', type: 'Router' });
        this.controllerClass.addMethod('init', ClassGen_1.ClassGen.Access.Protected);
        try {
            fs.mkdirpSync(this.path);
        }
        catch (e) {
        }
    };
    ExpressControllerGen.prototype.addResponseMethod = function (name) {
        var method = this.controllerClass.addMethod(name);
        method.addParameter({ name: 'req', type: 'Request' });
        method.addParameter({ name: 'res', type: 'Response' });
        method.addParameter({ name: 'next', type: 'Function' });
        method.setContent("return next({message: '" + name + " has not been implemented'})");
        return method;
    };
    ExpressControllerGen.prototype.addCRUDOperations = function () {
        var modelInstanceName = _.camelCase(this.config.model), modelClassName = _.capitalize(modelInstanceName), dbCodeGen = new DatabaseCodeGen_1.DatabaseCodeGen(modelClassName);
        this.controllerFile.addImport("{Err}", Util_1.Util.genRelativePath(this.path, "src/cmn/Err"));
        this.controllerFile.addImport("{DatabaseError}", Util_1.Util.genRelativePath(this.path, "src/cmn/error/DatabaseError"));
        this.controllerFile.addImport("{ValidationError}", Util_1.Util.genRelativePath(this.path, "src/cmn/error/ValidationError"));
        this.controllerFile.addImport("{" + modelClassName + ", I" + modelClassName + "}", Util_1.Util.genRelativePath(this.path, "src/cmn/models/" + modelClassName));
        this.controllerFile.addImport("{IQueryResult, IUpsertResult, IDeleteResult}", Util_1.Util.genRelativePath(this.path, "src/cmn/ICRUDResult"));
        var middleWares = " this.acl('__ACL__'),", acl = this.routingPath.replace(/\/+/g, '.');
        //
        var methodName = 'get' + modelClassName, methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.getAll');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getQueryCode(true));
        this.routeMethod.appendContent("router.get('" + this.routingPath + "/:id'," + methodBasedMiddleWares + " this." + methodName + ".bind(this));");
        //
        methodName = 'get' + Util_1.Util.plural(modelClassName);
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.get');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getQueryCode(false));
        this.routeMethod.appendContent("router.get('" + this.routingPath + "'," + methodBasedMiddleWares + " this." + methodName + ".bind(this));");
        //
        methodName = 'add' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.add');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getInsertCode());
        this.routeMethod.appendContent("router.post('" + this.routingPath + "'," + methodBasedMiddleWares + " this." + methodName + ".bind(this));");
        //
        methodName = 'update' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.update');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getUpdateCode());
        this.routeMethod.appendContent("router.put('" + this.routingPath + "'," + methodBasedMiddleWares + " this." + methodName + ".bind(this));");
        //
        methodName = 'remove' + modelClassName;
        methodBasedMiddleWares = middleWares.replace('__ACL__', acl + '.delete');
        this.addResponseMethod(methodName).setContent(dbCodeGen.getDeleteCode());
        this.routeMethod.appendContent("router.delete('" + this.routingPath + "'," + methodBasedMiddleWares + " this." + methodName + ".bind(this));");
    };
    ExpressControllerGen.prototype.generate = function () {
        if (this.config.model) {
            this.addCRUDOperations();
        }
        FsUtil_1.FsUtil.writeFile(path.join(this.path, this.controllerClass.name + '.ts'), this.controllerFile.generate());
        var filePath = 'src/api/ApiFactory.ts';
        var code = fs.readFileSync(filePath, { encoding: 'utf8' });
        if (code.search(Placeholder_1.Placeholder.Router)) {
            var relPath = Util_1.Util.genRelativePath('src/api', this.path);
            var importCode = "import {" + this.controllerClass.name + "} from '" + relPath + "/" + this.controllerClass.name + "';";
            if (code.indexOf(importCode) >= 0)
                return;
            var controllerCamel = _.camelCase(this.controllerClass.name);
            var embedCode = "var " + controllerCamel + " = new " + this.controllerClass.name + "(setting, database);\n        " + controllerCamel + ".route(router);\n        " + Placeholder_1.Placeholder.Router;
            code = importCode + '\n' + code.replace(Placeholder_1.Placeholder.Router, embedCode);
            FsUtil_1.FsUtil.writeFile(filePath, code);
        }
    };
    ExpressControllerGen.prototype.normalizeRoutingPath = function () {
        var edge = _.camelCase(this.config.name);
        this.routingPath = "" + this.config.route;
        if (this.routingPath.charAt(0) != '/')
            this.routingPath = "/" + this.routingPath;
        this.routingPath += "/" + edge;
        this.routingPath = this.routingPath.replace(/\/{2,}/g, '/');
    };
    ExpressControllerGen.getGeneratorConfig = function (name, callback) {
        var config = {}, models = Object.keys(ModelGen_1.ModelGen.getModelsList());
        models.unshift('None');
        var q = [
            {
                name: 'routingPath',
                type: 'input',
                message: 'Routing Path: ',
                choices: models,
                default: '/'
            },
            {
                name: 'model',
                type: 'list',
                message: 'Model for CRUD: ',
                choices: models,
                default: 'None'
            }];
        config.name = name;
        inquirer.prompt(q, function (answer) {
            var modelName = answer['model'];
            if (modelName != 'None') {
                config.model = modelName;
            }
            config.route = answer['routingPath'];
            callback(config);
        });
    };
    return ExpressControllerGen;
}());
exports.ExpressControllerGen = ExpressControllerGen;
