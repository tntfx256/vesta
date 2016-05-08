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
var FsUtil_1 = require("../util/FsUtil");
var CmdUtil_1 = require("../util/CmdUtil");
var ProjectGen = (function () {
    function ProjectGen(config) {
        this.config = config;
        //
        this.vesta = Vesta_1.Vesta.getInstance(config);
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
    ProjectGen.prototype.generate = function () {
        var dir = this.config.name;
        var projectRepo = this.vesta.getProjectConfig().repository;
        var projectTemplateName = projectRepo.express;
        var repoInfo = this.config.repository;
        var replacement = {};
        var isClientSideProject = this.config.type == ProjectGen.Type.ClientSide;
        var execOption = { cwd: dir };
        if (isClientSideProject) {
            projectTemplateName = this.config.client.framework == ClientAppGen_1.ClientAppGen.Framework.Ionic ? projectRepo.ionic : projectRepo.material;
        }
        FsUtil_1.FsUtil.mkdir(dir);
        //
        isClientSideProject ? this.clientApp.generate() : this.serverApp.generate();
        this.docker.compose();
        CmdUtil_1.CmdUtil.execSync("git init", execOption);
        this.vesta.generate();
        replacement[projectTemplateName] = this.config.name;
        Util_1.Util.findInFileAndReplace(dir + "/package.json", replacement);
        // Initiating the git repo -> create dev branch
        CmdUtil_1.CmdUtil.execSync("git add .", execOption);
        CmdUtil_1.CmdUtil.execSync("git commit -m Vesta-init", execOption);
        this.commonApp.generate();
        if (!repoInfo.baseUrl)
            return;
        CmdUtil_1.CmdUtil.execSync("git add .", execOption);
        CmdUtil_1.CmdUtil.execSync("git commit -m Vesta-common", execOption);
        CmdUtil_1.CmdUtil.execSync("git remote add origin " + GitGen_1.GitGen.getRepoUrl(repoInfo.baseUrl, repoInfo.group, repoInfo.name), execOption);
        CmdUtil_1.CmdUtil.execSync("git push -u origin master", execOption);
        CmdUtil_1.CmdUtil.execSync("git checkout -b dev", execOption);
        CmdUtil_1.CmdUtil.execSync("git push -u origin dev", execOption);
    };
    ProjectGen.getGeneratorConfig = function (name, category) {
        var appConfig = {};
        appConfig.name = _.camelCase(name);
        appConfig.client = {};
        appConfig.server = {};
        appConfig.repository = {
            baseUrl: '',
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
