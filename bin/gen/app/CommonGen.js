"use strict";
var path = require("path");
var ProjectGen_1 = require("../ProjectGen");
var GitGen_1 = require("../file/GitGen");
var Vesta_1 = require("../file/Vesta");
var Fs_1 = require("../../util/Fs");
var Cmd_1 = require("../../util/Cmd");
var CommonGen = (function () {
    function CommonGen(config) {
        this.config = config;
        this.vesta = Vesta_1.Vesta.getInstance();
    }
    CommonGen.prototype.addSubModule = function () {
        if (!this.config.repository.common)
            return;
        var dir = this.config.name;
        var destDir = this.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn';
        var repo = this.config.repository;
        return Cmd_1.Cmd.execSync("git submodule add -b dev " + GitGen_1.GitGen.getRepoUrl(repo.baseUrl, repo.group, repo.common) + " " + destDir, dir);
    };
    /**
     * git init
     * git commit --message=""
     * git remote add origin git@hbtb.ir:group/name.git
     * git push origin
     * git checkout -b dev
     * git push origin dev
     */
    CommonGen.prototype.createCommonProject = function () {
        var repository = this.config.repository, templateRepo = this.vesta.getProjectConfig().repository, cmnDir = repository.common;
        GitGen_1.GitGen.clone(GitGen_1.GitGen.getRepoUrl(templateRepo.baseUrl, templateRepo.group, templateRepo.common), cmnDir);
        GitGen_1.GitGen.cleanClonedRepo(cmnDir);
        Cmd_1.Cmd.execSync("git init", cmnDir);
        Cmd_1.Cmd.execSync("git add .", cmnDir);
        Cmd_1.Cmd.execSync("git commit -m Vesta-init", cmnDir);
        Cmd_1.Cmd.execSync("git remote add origin " + GitGen_1.GitGen.getRepoUrl(repository.baseUrl, repository.group, repository.common), cmnDir);
        Cmd_1.Cmd.execSync("git push -u origin master", cmnDir);
        Cmd_1.Cmd.execSync("git checkout -b dev", cmnDir);
        Cmd_1.Cmd.execSync("git push -u origin dev", cmnDir);
    };
    CommonGen.prototype.initWithoutSubModule = function () {
        var dir = this.config.name, templateRepo = this.vesta.getProjectConfig().repository, destDir = path.join(dir, this.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ? 'src/app/cmn' : 'src/cmn');
        Fs_1.Fs.mkdir(destDir);
        GitGen_1.GitGen.clone(GitGen_1.GitGen.getRepoUrl(templateRepo.baseUrl, templateRepo.group, templateRepo.common), destDir);
        GitGen_1.GitGen.cleanClonedRepo(destDir);
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
            if (!GitGen_1.GitGen.commonProjectExists) {
                this.createCommonProject();
            }
            return this.addSubModule();
        }
        this.initWithoutSubModule();
    };
    return CommonGen;
}());
exports.CommonGen = CommonGen;
