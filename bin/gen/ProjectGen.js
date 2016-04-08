"use strict";
var inquirer = require("inquirer");
var _ = require("lodash");
var Vesta_1 = require("./file/Vesta");
var ServerAppGen_1 = require("./app/ServerAppGen");
var CommonGen_1 = require("./app/CommonGen");
var Util_1 = require("../util/Util");
var GitGen_1 = require("./file/GitGen");
var ClientAppGen_1 = require("./app/client/ClientAppGen");
var ClientAppGenFactory_1 = require("./app/ClientAppGenFactory");
var DockerGen_1 = require("./code/DockerGen");
var Config_1 = require("../Config");
var ProjectGen = (function () {
    function ProjectGen(config) {
        this.config = config;
        //
        this.vesta = Vesta_1.Vesta.getInstance(config);
        this.git = new GitGen_1.GitGen(config);
        this.docker = new DockerGen_1.DockerGen(config);
        //
        this.commonApp = new CommonGen_1.CommonGen(config);
        if (config.type == ProjectGen.Type.ClientSide) {
            this.clientApp = ClientAppGenFactory_1.ClientAppGenFactory.create(config);
        }
        else if (config.type == ProjectGen.Type.ServerSide) {
            this.serverApp = new ServerAppGen_1.ServerAppGen(config);
        }
        ProjectGen.instance = this;
    }
    ProjectGen.prototype.initApp = function () {
        if (this.clientApp) {
            return this.clientApp.generate();
        }
        else if (this.serverApp) {
            return this.serverApp.generate();
        }
        return Promise.resolve();
    };
    ProjectGen.prototype.generate = function () {
        var _this = this;
        var dir = this.config.name, projectTemplateName, replacement = {};
        Util_1.Util.fs.mkdir(dir);
        //
        this.initApp()
            .then(function () { return _this.docker.compose(); })
            .then(function () { return Util_1.Util.exec("git init", dir); })
            .then(function () { return _this.commonApp.generate(); })
            .then(function () {
            // Removing cloned directory
            Util_1.Util.fs.remove(dir + "/fw");
            _this.vesta.generate();
            if (_this.config.type == ProjectGen.Type.ClientSide) {
                projectTemplateName = _this.config.client.framework == ClientAppGen_1.ClientAppGen.Framework.Ionic ? 'ionicCodeTemplate' : 'materialCodeTemplate';
            }
            else {
                projectTemplateName = 'expressCodeTemplate';
            }
            replacement[projectTemplateName] = _this.config.name;
            Util_1.Util.findInFileAndReplace(dir + "/package.json", replacement);
            if (_this.config.type == ProjectGen.Type.ClientSide) {
                Util_1.Util.findInFileAndReplace(dir + "/bower.json", replacement);
            }
            // Util.findInFileAndReplace(`${dir}/vesta.json`, replacement);
            // Initiating the git repo -> create dev branch
            return Util_1.Util.exec("git add .", dir)
                .then(function () { return Util_1.Util.exec("git commit -m Vesta", dir); })
                .then(function () { return _this.commonApp.addSubModule(); })
                .then(function () {
                return GitGen_1.GitGen.getRepoUrl(Config_1.Config.repository.baseRepoUrl, true)
                    .then(function (url) { return Util_1.Util.exec("git remote add origin " + url + ":" + _this.config.repository.group + "/" + _this.config.name + ".git", dir); })
                    .then(function () { return Util_1.Util.exec("git push -u origin master", dir); });
            })
                .then(function () { return Util_1.Util.exec("git add .", dir); })
                .then(function () { return Util_1.Util.exec("git commit -m subModule", dir); })
                .then(function () { return Util_1.Util.exec("git checkout -b dev", dir); })
                .then(function () { return Util_1.Util.exec("git push -u origin dev", dir); });
        })
            .catch(function (reason) {
            Util_1.Util.log.error(reason);
        });
    };
    ProjectGen.getGeneratorConfig = function (name, category) {
        var appConfig = {};
        appConfig.name = _.camelCase(name);
        appConfig.client = {};
        appConfig.server = {};
        appConfig.repository = {
            baseRepoUrl: Config_1.Config.repository.baseRepoUrl,
            group: category,
            common: '',
            name: appConfig.name
        };
        var questions = [{
                type: 'list',
                name: 'type',
                message: 'Project Type: ',
                choices: [ProjectGen.Type.ClientSide, ProjectGen.Type.ServerSide],
                default: ProjectGen.Type.ClientSide
            }, {
                type: 'input',
                name: 'endpoint',
                message: 'API Endpoint: ',
                default: 'http://localhost:3000'
            }];
        return new Promise(function (resolve, reject) {
            inquirer.prompt(questions, function (answer) {
                appConfig.type = answer['type'];
                appConfig.endpoint = answer['endpoint'];
                if (ProjectGen.Type.ServerSide == appConfig.type) {
                    resolve(ServerAppGen_1.ServerAppGen.getGeneratorConfig()
                        .then(function (serverAppConfig) {
                        appConfig.server = serverAppConfig;
                        return GitGen_1.GitGen.getGeneratorConfig(appConfig);
                    }));
                }
                else if (ProjectGen.Type.ClientSide == appConfig.type) {
                    resolve(ClientAppGen_1.ClientAppGen.getGeneratorConfig()
                        .then(function (clientAppConfig) {
                        appConfig.client = clientAppConfig;
                        return GitGen_1.GitGen.getGeneratorConfig(appConfig);
                    }));
                }
            });
        });
    };
    ProjectGen.getInstance = function () {
        return ProjectGen.getInstance();
    };
    ProjectGen.Type = { ServerSide: 'serverSide', ClientSide: 'clientSide' };
    return ProjectGen;
}());
exports.ProjectGen = ProjectGen;
