"use strict";
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var inquirer = require("inquirer");
var Vesta_1 = require("../../../file/Vesta");
var MaterialFormGen_1 = require("./form/MaterialFormGen");
var ModelGen_1 = require("../../ModelGen");
var EmptyFormGen_1 = require("./form/EmptyFormGen");
var ClientAppGen_1 = require("../../../app/client/ClientAppGen");
var IonicFormGen_1 = require("./form/IonicFormGen");
var FsUtil_1 = require("../../../../util/FsUtil");
var Log_1 = require("../../../../util/Log");
var NGFormGen = (function () {
    function NGFormGen(config) {
        this.config = config;
        this.path = 'src/app/templates';
        this.vesta = Vesta_1.Vesta.getInstance();
        this.model = ModelGen_1.ModelGen.getModel(config.model);
        if (this.model) {
            this.schema = this.model['schema'];
            var projectConfig = this.vesta.getConfig();
            switch (projectConfig.client.framework) {
                case ClientAppGen_1.ClientAppGen.Framework.Material:
                    this.form = new MaterialFormGen_1.MaterialFormGen(this.model);
                    break;
                case ClientAppGen_1.ClientAppGen.Framework.Ionic:
                    this.form = new IonicFormGen_1.IonicFormGen(this.model);
                    break;
            }
            this.path = path.join(this.path, config.module, _.camelCase(this.schema.name));
        }
        else {
            Log_1.Log.error("Model file was not found. You have to run gulp task first.");
            this.form = new EmptyFormGen_1.EmptyFormGen(null);
        }
        try {
            fs.mkdirpSync(this.path);
        }
        catch (e) {
        }
    }
    NGFormGen.prototype.generate = function () {
        if (!this.model)
            return;
        var code = this.form.generate();
        if (this.config.writeToFile)
            FsUtil_1.FsUtil.writeFile(path.join(this.path, 'form.html'), code);
        return code;
    };
    NGFormGen.prototype.wrap = function (config) {
        return this.form.wrap(config);
    };
    NGFormGen.getGeneratorConfig = function (callback) {
        var models = Object.keys(ModelGen_1.ModelGen.getModelsList()), config = {};
        config.module = '';
        var qs = [
            { name: 'module', type: 'input', message: 'Module Name: ' }
        ];
        if (models.length) {
            qs.push({ name: 'model', type: 'list', message: 'Model: ', choices: models, default: models[0] });
        }
        else {
            return Log_1.Log.error('There is no model to generate form upon');
        }
        inquirer.prompt(qs, function (answer) {
            if (answer['module']) {
                config.module = answer['module'];
            }
            config.model = answer['model'];
            callback(config);
        });
    };
    NGFormGen.Type = { Add: 'add', Edit: 'edit' };
    return NGFormGen;
}());
exports.NGFormGen = NGFormGen;
