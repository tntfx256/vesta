"use strict";
var fs = require("fs-extra");
var _ = require("lodash");
var Err_1 = require("../cmn/Err");
var GitGen_1 = require("../gen/file/GitGen");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var ProjectGen_1 = require("../gen/ProjectGen");
var Fs_1 = require("../util/Fs");
var Log_1 = require("../util/Log");
var Cmd_1 = require("../util/Cmd");
var isRoot = require('is-root');
var Deployer = (function () {
    function Deployer(config) {
        this.config = config;
        var date = new GregorianDate_1.GregorianDate();
        this.config.history.push({ date: date.format('Y/m/d H:i:s'), type: 'deploy' });
        this.stagingPath = config.projectName;
        Fs_1.Fs.remove(this.stagingPath);
        Fs_1.Fs.mkdir(config.deployPath);
    }
    Deployer.prototype.deploy = function () {
        GitGen_1.GitGen.clone(this.config.repositoryUrl, this.stagingPath);
        var vestaJsonFile = this.stagingPath + "/vesta.json";
        try {
            this.vesta = JSON.parse(fs.readFileSync(vestaJsonFile, { encoding: 'utf8' }));
        }
        catch (e) {
            Fs_1.Fs.remove(this.stagingPath);
            return Log_1.Log.error(vestaJsonFile + " not found");
        }
        this.vesta.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        Fs_1.Fs.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    };
    Deployer.prototype.deployServerSideProject = function () {
        var deployPath = this.config.deployPath + "/" + this.config.projectName;
        var isAlreadyRunning = fs.existsSync(deployPath);
        Cmd_1.Cmd.execSync("git submodule update --init src/cmn", this.stagingPath);
        Fs_1.Fs.copy(this.stagingPath + "/resources/gitignore/src/config/setting.var.ts", this.stagingPath + "/src/config/setting.var.ts");
        Fs_1.Fs.copy(this.stagingPath + "/package.json", this.stagingPath + "/build/api/src/package.json");
        Cmd_1.Cmd.execSync("npm install", this.stagingPath);
        Cmd_1.Cmd.execSync("gulp prod", this.stagingPath);
        Cmd_1.Cmd.execSync("npm install --production", this.stagingPath + "/build/api/src");
        if (isAlreadyRunning) {
            Cmd_1.Cmd.execSync("docker-compose stop -t 5", deployPath);
            Cmd_1.Cmd.execSync("docker-compose down", deployPath);
            Cmd_1.Cmd.execSync("rm -Rf " + deployPath);
        }
        Fs_1.Fs.rename(this.stagingPath + "/build", deployPath);
        Cmd_1.Cmd.execSync("docker-compose up -d", deployPath);
        Cmd_1.Cmd.execSync("rm -Rf " + this.stagingPath);
    };
    Deployer.prototype.deployClientSideProject = function () {
        // Fs.copy(`${this.projectName}/resources/gitignore/src/app/config/setting.var.ts`, `${this.projectName}/src/app/config/setting.var.ts`);
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
