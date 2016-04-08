"use strict";
var ProjectGen_1 = require("../ProjectGen");
var Util_1 = require("../../util/Util");
var ClientAppGen_1 = require("../app/client/ClientAppGen");
var inquirer = require("inquirer");
var GitGen = (function () {
    function GitGen(config) {
        this.config = config;
    }
    GitGen.clone = function (repository, destination, branch) {
        if (destination === void 0) { destination = ''; }
        if (branch === void 0) { branch = ''; }
        var branchCmd = branch ? " -b " + branch + " " : ' ';
        return Util_1.Util.exec("git clone" + branchCmd + repository + " " + destination);
    };
    GitGen.getCredentials = function () {
        if (GitGen.credentials)
            return Promise.resolve(GitGen.credentials);
        return new Promise(function (resolve, reject) {
            inquirer.prompt([
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
            ], function (answer) {
                GitGen.credentials = {
                    username: answer['username'],
                    password: answer['password']
                };
                resolve(GitGen.credentials);
            });
        });
    };
    GitGen.getRepoUrl = function (httpUrl, useSSH) {
        if (useSSH === void 0) { useSSH = false; }
        if (useSSH) {
            var host = /^https?:\/\/([^:\/]+).*/.exec(httpUrl)[1];
            return Promise.resolve("git@" + host);
        }
        return GitGen.getCredentials()
            .then(function (credentials) { return Promise.resolve(httpUrl.replace(/(https?:\/\/)(.+)/, "$1" + credentials.username + ":" + credentials.password + "@$2")); });
    };
    GitGen.cleanClonedRepo = function (basePath) {
        Util_1.Util.fs.remove(basePath + "/.git");
        Util_1.Util.fs.remove(basePath + "/.gitmodule");
        Util_1.Util.fs.remove(basePath + "/src/cmn");
        Util_1.Util.fs.remove(basePath + "/src/app/cmn");
        return Promise.resolve();
    };
    GitGen.getGeneratorConfig = function (appConfig) {
        return new Promise(function (resolve) {
            inquirer.prompt({
                type: 'confirm',
                name: 'initRepository',
                message: 'Init git repository? '
            }, function (answer) {
                if (!answer['initRepository'])
                    return resolve(appConfig);
                var qs = [{
                        type: 'input',
                        name: 'baseRepoUrl',
                        message: 'Remote repository base url: (http://example.com:9000)'
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
                    name: 'firstTime',
                    message: 'Common project already exists: '
                });
                inquirer.prompt(qs, function (answer) {
                    if (!appConfig.repository.group) {
                        if (!answer['group'])
                            return resolve(appConfig);
                    }
                    appConfig.name = answer['projectName'];
                    appConfig.repository = {
                        firstTime: !answer['firstTime'],
                        baseRepoUrl: answer['baseRepoUrl'],
                        group: answer['group'],
                        name: appConfig.name,
                        common: answer['common']
                    };
                    resolve(appConfig);
                });
            });
        });
    };
    return GitGen;
}());
exports.GitGen = GitGen;
