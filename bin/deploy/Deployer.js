"use strict";
var fs = require("fs-extra");
var _ = require("lodash");
var Err_1 = require("../cmn/Err");
var GitGen_1 = require("../gen/file/GitGen");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var ProjectGen_1 = require("../gen/ProjectGen");
var FsUtil_1 = require("../util/FsUtil");
var Log_1 = require("../util/Log");
var CmdUtil_1 = require("../util/CmdUtil");
var isRoot = require('is-root');
var Deployer = (function () {
    function Deployer(config) {
        this.config = config;
        var date = new GregorianDate_1.GregorianDate();
        this.config.history.push({ date: date.format('Y/m/d H:i:s'), type: 'deploy' });
        this.stagingPath = config.projectName;
        FsUtil_1.FsUtil.remove(this.stagingPath);
        FsUtil_1.FsUtil.mkdir(config.deployPath);
    }
    Deployer.prototype.deploy = function () {
        GitGen_1.GitGen.clone(this.config.repositoryUrl, this.stagingPath);
        var vestaJsonFile = this.stagingPath + "/vesta.json";
        try {
            this.vesta = JSON.parse(fs.readFileSync(vestaJsonFile, { encoding: 'utf8' }));
        }
        catch (e) {
            FsUtil_1.FsUtil.remove(this.stagingPath);
            return Log_1.Log.error(vestaJsonFile + " not found");
        }
        this.vesta.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        FsUtil_1.FsUtil.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    };
    Deployer.prototype.deployServerSideProject = function () {
        var deployPath = this.config.deployPath + "/" + this.config.projectName;
        var isAlreadyRunning = fs.existsSync(deployPath);
        var execOption = { cwd: this.stagingPath };
        CmdUtil_1.CmdUtil.execSync("git submodule update --init src/cmn", execOption);
        FsUtil_1.FsUtil.copy(this.stagingPath + "/resources/gitignore/src/config/setting.var.ts", this.stagingPath + "/src/config/setting.var.ts");
        FsUtil_1.FsUtil.copy(this.stagingPath + "/package.json", this.stagingPath + "/build/api/src/package.json");
        CmdUtil_1.CmdUtil.execSync("npm install", execOption);
        CmdUtil_1.CmdUtil.execSync("gulp prod", execOption);
        CmdUtil_1.CmdUtil.execSync("npm install --production", { cwd: this.stagingPath + "/build/api/src" });
        execOption.cwd = deployPath;
        if (isAlreadyRunning) {
            CmdUtil_1.CmdUtil.execSync("docker-compose stop -t 5", execOption);
            CmdUtil_1.CmdUtil.execSync("docker-compose down", execOption);
            CmdUtil_1.CmdUtil.execSync("rm -Rf " + deployPath);
        }
        FsUtil_1.FsUtil.rename(this.stagingPath + "/build", deployPath);
        CmdUtil_1.CmdUtil.execSync("docker-compose up -d", execOption);
        CmdUtil_1.CmdUtil.execSync("rm -Rf " + this.stagingPath);
    };
    Deployer.prototype.deployClientSideProject = function () {
        // FsUtil.copy(`${this.projectName}/resources/gitignore/src/app/config/setting.var.ts`, `${this.projectName}/src/app/config/setting.var.ts`);
    };
    Deployer.getProjectName = function (url) {
        var _a = /.+\/(.+)\/(.+)\.git$/.exec(url), group = _a[1], project = _a[2];
        return group + "-" + project;
    };
    Deployer.getDeployConfig = function (args) {
        if (!isRoot()) {
            Log_1.Log.error('You must run this command as root!');
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.OperationFailed));
        }
        var config = {
            history: [],
            deployPath: "app"
        };
        if (!args[0]) {
            Log_1.Log.error('Invalid HTTP url of remote repository');
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        Log_1.Log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
        if (fs.existsSync(args[0])) {
            _.assign(config, Deployer.fetchConfig(args[0]));
        }
        else {
            config.repositoryUrl = args[0];
            config.projectName = Deployer.getProjectName(config.repositoryUrl);
            if (fs.existsSync(config.projectName + ".json")) {
                _.assign(config, Deployer.fetchConfig(config.projectName + ".json"));
            }
        }
        Deployer.ConfigFile = config.projectName + ".json";
        return Promise.resolve(config);
    };
    Deployer.fetchConfig = function (filename) {
        var config = {};
        try {
            config = JSON.parse(fs.readFileSync(filename, { encoding: 'utf8' }));
        }
        catch (e) {
            Log_1.Log.error("Deploy config file -" + filename + "- is corrupted!");
            return null;
        }
        return config;
    };
    return Deployer;
}());
exports.Deployer = Deployer;
