"use strict";
var ProjectGen_1 = require("../ProjectGen");
var Util_1 = require("../../util/Util");
var GitGen_1 = require("../file/GitGen");
var Config_1 = require("../../Config");
var resolve = Promise.resolve;
var CommonGen = (function () {
    function CommonGen(config) {
        this.config = config;
    }
    /**
     * git init
     * git commit --message=""
     * git remote add origin git@hbtb.ir:group/name.git
     * git push origin
     * git checkout -b dev
     * git push origin dev
     */
    CommonGen.prototype.initFirstTimeCommonProject = function () {
        var repository = this.config.repository, cmnDir = repository.common;
        return GitGen_1.GitGen.getRepoUrl(Config_1.Config.repository.baseRepoUrl)
            .then(function (url) {
            return GitGen_1.GitGen.clone(url + "/" + Config_1.Config.repository.group + "/commonCodeTemplate.git", cmnDir);
        })
            .then(function () { return GitGen_1.GitGen.cleanClonedRepo(cmnDir); })
            .then(function () { return Util_1.Util.exec("git init", cmnDir); })
            .then(function () { return Util_1.Util.exec("git add .", cmnDir); })
            .then(function () { return Util_1.Util.exec("git commit -m Vesta", cmnDir); })
            .then(function () { return GitGen_1.GitGen.getRepoUrl(repository.baseRepoUrl, true); })
            .then(function (sshUrl) { return Util_1.Util.exec("git remote add origin " + sshUrl + ":" + repository.group + "/" + repository.common + ".git", cmnDir); })
            .then(function () { return Util_1.Util.exec("git push -u origin master", cmnDir); })
            .then(function () { return Util_1.Util.exec("git checkout -b dev", cmnDir); })
            .then(function () { return Util_1.Util.exec("git push -u origin dev", cmnDir); });
    };
    CommonGen.prototype.addSubModule = function () {
        var _this = this;
        if (!this.config.repository.common)
            return resolve();
        var dir = this.config.name, destDir = this.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        return GitGen_1.GitGen.getRepoUrl(Config_1.Config.repository.baseRepoUrl, true)
            .then(function (url) { return Util_1.Util.exec("git submodule add -b dev " + url + ":" + _this.config.repository.group + "/" + _this.config.repository.common + ".git " + destDir, dir); });
    };
    CommonGen.prototype.initWithoutSubModule = function () {
        var dir = this.config.name, destDir = this.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        Util_1.Util.fs.mkdir(destDir, dir + "/fw/common");
        return GitGen_1.GitGen.getRepoUrl(Config_1.Config.repository.baseRepoUrl)
            .then(function (url) { return GitGen_1.GitGen.clone(url + "/" + Config_1.Config.repository.group + "/commonCodeTemplate.git", dir + "/fw/common"); })
            .then(function () { return Util_1.Util.fs.copy(dir + "/fw/common", destDir); });
    };
    /**
     * if ( init git project )
     *      if ( first time )   => create dir => clone template => init => branch => push => add submodule
     *      else                => add .submodule
     * else                     => clone template
     *
     * SubModule must be added after the init & commit of main project,
     * so it's function addSubModule is called from ProjectGen
     */
    CommonGen.prototype.generate = function () {
        if (this.config.repository.common) {
            if (this.config.repository['firstTime']) {
                return this.initFirstTimeCommonProject();
            }
            return Promise.resolve();
        }
        return this.initWithoutSubModule();
    };
    return CommonGen;
}());
exports.CommonGen = CommonGen;
