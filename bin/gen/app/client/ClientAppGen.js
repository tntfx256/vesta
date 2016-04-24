"use strict";
var inquirer = require("inquirer");
var Vesta_1 = require("../../file/Vesta");
var Util_1 = require("../../../util/Util");
var GitGen_1 = require("../../file/GitGen");
var FsUtil_1 = require("../../../util/FsUtil");
var Log_1 = require("../../../util/Log");
var ClientAppGen = (function () {
    function ClientAppGen(config) {
        this.config = config;
        this.isCordova = config.client.platform == ClientAppGen.Platform.Cordova;
        this.vesta = Vesta_1.Vesta.getInstance(config);
    }
    ClientAppGen.prototype.getRepoName = function () {
        var name = '', repo = this.vesta.getProjectConfig().repository;
        if (this.config.client.platform == ClientAppGen.Platform.Cordova) {
            name = repo.ionic;
        }
        else {
            name = repo.material;
        }
        return name;
    };
    ClientAppGen.prototype.cloneTemplate = function () {
        var dir = this.config.name, repo = this.vesta.getProjectConfig().repository;
        GitGen_1.GitGen.clone(GitGen_1.GitGen.getRepoUrl(repo.baseUrl, repo.group, this.getRepoName()), dir);
        GitGen_1.GitGen.cleanClonedRepo(dir);
    };
    ClientAppGen.prototype.generate = function () {
        this.cloneTemplate();
        var dir = this.config.name, templateProjectName = this.getRepoName(), replacePattern = {};
        replacePattern[templateProjectName] = dir;
        Util_1.Util.findInFileAndReplace(dir + "/src/app/config/setting.ts", replacePattern);
        Util_1.Util.findInFileAndReplace(dir + "/resources/gitignore/src/app/config/setting.var.ts", {
            'http://localhost:3000': this.config.endpoint
        });
        Util_1.Util.findInFileAndReplace(dir + "/resources/gitignore/resources/gulp/setting.js", {
            'http://localhost': /(https?:\/\/[^:]+).*/.exec(this.config.endpoint)[1]
        });
        FsUtil_1.FsUtil.copy(dir + "/resources/gitignore/resources/gulp/setting.js", dir + "/resources/gulp/setting.js");
        FsUtil_1.FsUtil.copy(dir + "/resources/gitignore/src/app/config/setting.var.ts", dir + "/src/app/config/setting.var.ts");
        if (this.isCordova) {
            FsUtil_1.FsUtil.mkdir(dir + "/www"); // for installing plugins this folder must exist
            Util_1.Util.findInFileAndReplace(dir + '/config.xml', replacePattern);
        }
    };
    ClientAppGen.getGeneratorConfig = function () {
        var config = {};
        var qs = [
            {
                type: 'list',
                name: 'platform',
                message: 'Platform: ',
                choices: [ClientAppGen.Platform.Browser, ClientAppGen.Platform.Cordova]
            }];
        Log_1.Log.info("For browser platform we use Material Design, and on Cordova we use Ionic (both on Angular 1.x)");
        return new Promise(function (resolve) {
            inquirer.prompt(qs, function (answer) {
                config.type = ClientAppGen.Type.Angular;
                config.platform = answer['platform'];
                config.framework = config.platform == ClientAppGen.Platform.Browser ? ClientAppGen.Framework.Material : ClientAppGen.Framework.Ionic;
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
