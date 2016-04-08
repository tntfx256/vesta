"use strict";
var inquirer = require("inquirer");
var Vesta_1 = require("../../file/Vesta");
var Util_1 = require("../../../util/Util");
var GitGen_1 = require("../../file/GitGen");
var Config_1 = require("../../../Config");
var ClientAppGen = (function () {
    function ClientAppGen(config) {
        this.config = config;
        this.isCordova = config.client.platform == ClientAppGen.Platform.Cordova;
        this.vesta = Vesta_1.Vesta.getInstance(config);
    }
    ClientAppGen.prototype.getRepoName = function () {
        var name = '';
        if (this.config.client.platform == ClientAppGen.Platform.Cordova) {
            name = 'ionicCordovaTemplate';
        }
        else {
            name = 'materialWebTemplate';
        }
        return name;
    };
    ClientAppGen.prototype.cloneTemplate = function () {
        var _this = this;
        var dir = this.config.name;
        return GitGen_1.GitGen.getRepoUrl(Config_1.Config.repository.baseRepoUrl)
            .then(function (url) { return GitGen_1.GitGen.clone(url + "/" + Config_1.Config.repository.group + "/" + _this.getRepoName() + ".git", dir); })
            .then(function () { return GitGen_1.GitGen.cleanClonedRepo(dir); });
    };
    ClientAppGen.prototype.generate = function () {
        var _this = this;
        return this.cloneTemplate()
            .then(function () {
            var dir = _this.config.name, templateProjectName = _this.getRepoName(), replacePattern = {};
            replacePattern[templateProjectName] = dir;
            Util_1.Util.findInFileAndReplace(dir + "/src/app/config/setting.ts", replacePattern);
            Util_1.Util.findInFileAndReplace(dir + "/resources/gitignore/src/app/config/setting.var.ts", {
                'http://localhost:3000': _this.config.endpoint
            });
            Util_1.Util.fs.copy(dir + "/resources/gitignore/src/app/config/setting.var.ts", dir + "/src/app/config/setting.var.ts");
            if (_this.isCordova) {
                Util_1.Util.fs.mkdir(dir + "/www"); // for installing plugins this folder must exist
                Util_1.Util.findInFileAndReplace(dir + '/config.xml', replacePattern);
            }
        });
    };
    ClientAppGen.getGeneratorConfig = function () {
        var qs = [
            {
                type: 'list',
                name: 'platform',
                message: 'Platform: ',
                choices: [ClientAppGen.Platform.Browser, ClientAppGen.Platform.Cordova],
                default: ClientAppGen.Platform.Browser
            },
            {
                type: 'list',
                name: 'type',
                message: 'Client Side Type: ',
                choices: [ClientAppGen.Type.Angular, ClientAppGen.Type.Angular2],
                default: ClientAppGen.Type.Angular
            },
            {
                type: 'list',
                name: 'framework',
                message: 'Framework: ',
                choices: [ClientAppGen.Framework.Material, ClientAppGen.Framework.Ionic],
                default: ClientAppGen.Framework.Material
            }], config = {};
        return new Promise(function (resolve) {
            inquirer.prompt(qs, function (answer) {
                config.platform = answer['platform'];
                config.type = answer['type'];
                config.framework = answer['framework'];
                resolve(config);
            });
        });
    };
    ClientAppGen.Type = { Angular: 'angular', Angular2: 'angular2' };
    ClientAppGen.Platform = { Browser: 'browser', Cordova: 'cordova' };
    ClientAppGen.Framework = { Material: 'material', Ionic: 'ionic' };
    return ClientAppGen;
}());
exports.ClientAppGen = ClientAppGen;
