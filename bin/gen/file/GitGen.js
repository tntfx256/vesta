"use strict";
var ProjectGen_1 = require("../ProjectGen");
var ClientAppGen_1 = require("../app/client/ClientAppGen");
var FsUtil_1 = require("../../util/FsUtil");
var CmdUtil_1 = require("../../util/CmdUtil");
var Util_1 = require("../../util/Util");
var GitGen = (function () {
    function GitGen() {
    }
    GitGen.clone = function (repository, destination, branch) {
        if (destination === void 0) { destination = ''; }
        if (branch === void 0) { branch = ''; }
        var branchCmd = branch ? " -b " + branch + " " : ' ';
        return CmdUtil_1.CmdUtil.execSync("git clone" + branchCmd + repository + " " + destination);
    };
    GitGen.getRepoUrl = function (baseUrl, group, repository) {
        return /^git.+/.exec(baseUrl) ?
            baseUrl + ":" + group + "/" + repository + ".git" :
            baseUrl + "/" + group + "/" + repository + ".git";
    };
    GitGen.cleanClonedRepo = function (basePath) {
        FsUtil_1.FsUtil.remove(basePath + "/.git");
        FsUtil_1.FsUtil.remove(basePath + "/.gitmodule");
        FsUtil_1.FsUtil.remove(basePath + "/src/cmn");
        FsUtil_1.FsUtil.remove(basePath + "/src/app/cmn");
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
                    default: 'https://git.hbtb.ir'
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
                    group: appConfig.repository.group || answer['group'],
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
