"use strict";
var ProjectGen_1 = require("../ProjectGen");
var Util_1 = require("../../util/Util");
var ClientAppGen_1 = require("../app/client/ClientAppGen");
var Err_1 = require("../../cmn/Err");
var GitGen = (function () {
    function GitGen(config) {
        this.config = config;
    }
    GitGen.clone = function (repository, destination, branch) {
        if (destination === void 0) { destination = ''; }
        if (branch === void 0) { branch = ''; }
        var branchCmd = branch ? " -b " + branch + " " : ' ';
        return Util_1.Util.execSync("git clone" + branchCmd + repository + " " + destination);
    };
    GitGen.getCredentials = function () {
        if (GitGen.credentials)
            return Promise.resolve(GitGen.credentials);
        return Util_1.Util.prompt([
            {
                type: 'input',
                message: 'Username: ',
                name: 'username'
            },
            {
                type: 'password',
                message: 'Password: ',
                name: 'password'
            }
        ]).then(function (answer) {
            GitGen.credentials = {
                username: answer['username'],
                password: answer['password']
            };
            return GitGen.credentials;
        });
    };
    GitGen.convertToSsh = function (httpUrl, useCredential) {
        if (useCredential === void 0) { useCredential = true; }
        var regExpArray = /^https?:\/\/([^:\/]+).*/.exec(httpUrl);
        if (!regExpArray) {
            Util_1.Util.log.error("Wrong repository base address: " + httpUrl);
            Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        return "git@" + regExpArray[1];
    };
    GitGen.cleanClonedRepo = function (basePath) {
        Util_1.Util.fs.remove(basePath + "/.git");
        Util_1.Util.fs.remove(basePath + "/.gitmodule");
        Util_1.Util.fs.remove(basePath + "/src/cmn");
        Util_1.Util.fs.remove(basePath + "/src/app/cmn");
    };
    GitGen.getGeneratorConfig = function (appConfig) {
        return Util_1.Util.prompt({
            type: 'confirm',
            name: 'initRepository',
            message: 'Init git repository: '
        }).then(function (answer) {
            if (!answer['initRepository'])
                return Promise.resolve(appConfig);
            var qs = [{
                    type: 'input',
                    name: 'baseUrl',
                    message: 'Repository base url:',
                    default: 'http://hbtb.ir:8080'
                }];
            if (!appConfig.repository.group) {
                qs.push({
                    type: 'input',
                    name: 'group',
                    message: 'Group name of the remote git repository: '
                });
            }
            var defaultProjectName = appConfig.name + "ApiServer";
            if (appConfig.type == ProjectGen_1.ProjectGen.Type.ClientSide) {
                defaultProjectName = appConfig.name + (appConfig.client.platform == ClientAppGen_1.ClientAppGen.Platform.Browser ? 'WebInterface' : 'App');
            }
            qs.push({
                type: 'input',
                name: 'projectName',
                message: 'Remote repository name: ',
                default: defaultProjectName
            });
            qs.push({
                type: 'input',
                name: 'common',
                message: 'Remote repository name for common source: ',
                default: appConfig.name + "CommonCode"
            });
            qs.push({
                type: 'confirm',
                name: 'commonExists',
                message: 'Common project already exists: '
            });
            return Util_1.Util.prompt(qs).then(function (answer) {
                if (!appConfig.repository.group && !answer['group'])
                    return appConfig;
                appConfig.name = answer['projectName'];
                GitGen.commonProjectExists = answer['commonExists'];
                appConfig.repository = {
                    baseUrl: answer['baseUrl'],
                    group: answer['group'],
                    name: appConfig.name,
                    common: answer['common']
                };
                return appConfig;
            });
        });
    };
    GitGen.commonProjectExists = true;
    return GitGen;
}());
exports.GitGen = GitGen;
