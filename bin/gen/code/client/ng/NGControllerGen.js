"use strict";
var inquirer = require("inquirer");
var NGControllerGenFactory_1 = require("./controller/NGControllerGenFactory");
var Vesta_1 = require("../../../file/Vesta");
var ModelGen_1 = require("../../ModelGen");
var NGDependencyInjector_1 = require("./NGDependencyInjector");
var NGControllerGen = (function () {
    function NGControllerGen(config) {
        this.config = config;
        var framework = Vesta_1.Vesta.getInstance().getConfig().client.framework;
        this.controller = NGControllerGenFactory_1.ControllerGenFactory.create(framework, config);
    }
    NGControllerGen.prototype.setAsAddController = function () {
        this.controller.setAsAddController();
    };
    NGControllerGen.prototype.setAsEditController = function () {
        this.controller.setAsEditController();
    };
    NGControllerGen.prototype.generate = function () {
        this.controller.generate();
    };
    NGControllerGen.getGeneratorConfig = function (callback) {
        var models = Object.keys(ModelGen_1.ModelGen.getModelsList()), config = {};
        config.openFormInModal = false;
        config.module = '';
        inquirer.prompt({ name: 'module', type: 'input', message: 'Module Name: ' }, function (answer) {
            if (answer['module']) {
                config.module = answer['module'];
            }
            NGDependencyInjector_1.NGDependencyInjector.getCliInjectables([{ name: '$scope', isLib: true }])
                .then(function (injectables) {
                config.injects = injectables;
                if (models.length) {
                    models.splice(0, 0, 'None');
                    return inquirer.prompt({
                        name: 'model',
                        type: 'list',
                        message: 'Model: ',
                        choices: models,
                        default: 'None'
                    }, function (answer) {
                        if (answer['model'] != 'None') {
                            config.model = answer['model'];
                        }
                        callback(config);
                    });
                }
                callback(config);
            });
        });
    };
    return NGControllerGen;
}());
exports.NGControllerGen = NGControllerGen;
