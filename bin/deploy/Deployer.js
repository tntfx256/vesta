"use strict";
var fs = require("fs-extra");
var _ = require("lodash");
var Util_1 = require("../util/Util");
var Err_1 = require("../cmn/Err");
var GitGen_1 = require("../gen/file/GitGen");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var ProjectGen_1 = require("../gen/ProjectGen");
var isRoot = require('is-root');
var Deployer = (function () {
    function Deployer(config) {
        this.config = config;
        var date = new GregorianDate_1.GregorianDate();
        this.config.history.push({ date: date.format('Y/m/d H:i:s'), type: 'deploy' });
        this.stagingPath = config.projectName;
        Util_1.Util.fs.remove(this.stagingPath);
        Util_1.Util.fs.mkdir(config.deployPath);
    }
    Deployer.prototype.deploy = function () {
        GitGen_1.GitGen.clone(this.config.repositoryUrl, this.stagingPath);
        var vestaJsonFile = this.stagingPath + "/vesta.json";
        try {
            this.vesta = JSON.parse(fs.readFileSync(vestaJsonFile, { encoding: 'utf8' }));
        }
        catch (e) {
            Util_1.Util.fs.remove(this.stagingPath);
            return Util_1.Util.log.error(vestaJsonFile + " not found");
        }
        this.vesta.config.type == ProjectGen_1.ProjectGen.Type.ClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        Util_1.Util.fs.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    };
    Deployer.prototype.deployServerSideProject = function () {
        var deployPath = this.config.deployPath + "/" + this.config.projectName;
        var isAlreadyRunning = fs.existsSync(deployPath);
        Util_1.Util.execSync("git submodule update --init src/cmn", this.stagingPath);
        Util_1.Util.fs.copy(this.stagingPath + "/resources/gitignore/src/config/setting.var.ts", this.stagingPath + "/src/config/setting.var.ts");
        Util_1.Util.fs.copy(this.stagingPath + "/package.json", this.stagingPath + "/build/api/src/package.json");
        Util_1.Util.execSync("npm install", this.stagingPath);
        Util_1.Util.execSync("gulp prod", this.stagingPath);
        Util_1.Util.execSync("npm install --production", this.stagingPath + "/build/api/src");
        if (isAlreadyRunning) {
            Util_1.Util.execSync("docker-compose stop -t 5", deployPath);
            Util_1.Util.execSync("docker-compose down", deployPath);
            Util_1.Util.execSync("rm -Rf " + deployPath);
        }
        Util_1.Util.fs.rename(this.stagingPath + "/build", deployPath);
        Util_1.Util.execSync("docker-compose up -d", deployPath);
        Util_1.Util.execSync("rm -Rf " + this.stagingPath);
    };
    Deployer.prototype.deployClientSideProject = function () {
        // Util.fs.copy(`${this.projectName}/resources/gitignore/src/app/config/setting.var.ts`, `${this.projectName}/src/app/config/setting.var.ts`);
    };
    Deployer.getProjectName = function (url) {
        var _a = /.+\/(.+)\/(.+)\.git$/.exec(url), group = _a[1], project = _a[2];
        return group + "-" + project;
    };
    Deployer.getDeployConfig = function (args) {
        if (!isRoot()) {
            Util_1.Util.log.error('You must run this command as root!');
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.OperationFailed));
        }
        var config = {
            history: [],
            deployPath: "app"
        };
        if (!args[0]) {
            Util_1.Util.log.error('Invalid HTTP url of remote repository');
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        Util_1.Util.log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
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
            Util_1.Util.log.error("Deploy config file -" + filename + "- is corrupted!");
            return null;
        }
        return config;
    };
    return Deployer;
}());
exports.Deployer = Deployer;
