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
var Util_1 = require("../util/Util");
var DockerUtil_1 = require("../util/DockerUtil");
var Deployer = (function () {
    function Deployer(config) {
        this.config = config;
        this.showUpdateWarning = false;
        this.isClientSide = false;
        var date = new GregorianDate_1.GregorianDate();
        this.config.history.push({ date: date.format('Y/m/d H:i:s'), type: 'deploy' });
        this.cloningPath = config.projectName;
        FsUtil_1.FsUtil.remove(this.cloningPath);
        FsUtil_1.FsUtil.mkdir(config.deployPath);
    }
    Deployer.prototype.deploy = function () {
        if (this.config.lbPath) {
            if (!fs.existsSync(this.config.lbPath + "/docker-compose.yml")) {
                return Log_1.Log.error("docker-compose.yml file was not found at '" + this.config.lbPath + "'");
            }
            FsUtil_1.FsUtil.mkdir(this.config.lbPath + "/conf.d");
        }
        GitGen_1.GitGen.clone(this.config.repositoryUrl, this.cloningPath);
        var execOption = { cwd: this.cloningPath };
        CmdUtil_1.CmdUtil.execSync("git checkout master", execOption);
        var vestaJsonFile = this.cloningPath + "/vesta.json";
        try {
            this.vesta = JSON.parse(fs.readFileSync(vestaJsonFile, { encoding: 'utf8' }));
        }
        catch (e) {
            FsUtil_1.FsUtil.remove(this.cloningPath);
            return Log_1.Log.error(vestaJsonFile + " not found");
        }
        this.isClientSide = this.vesta.config.type == ProjectGen_1.ProjectGen.Type.ClientSide;
        var submodulePath = this.isClientSide ? 'src/app/cmn' : 'src/cmn', varConfigFilePath = this.isClientSide ? 'src/app/config/setting.var.ts' : 'src/config/setting.var.ts';
        CmdUtil_1.CmdUtil.execSync("git submodule update --init " + submodulePath, execOption);
        CmdUtil_1.CmdUtil.execSync("git submodule foreach git checkout master", execOption);
        FsUtil_1.FsUtil.copy(this.cloningPath + "/resources/gitignore/" + varConfigFilePath, this.cloningPath + "/" + varConfigFilePath);
        this.isClientSide ?
            this.deployClientSideProject() :
            this.deployServerSideProject();
        FsUtil_1.FsUtil.writeFile(Deployer.ConfigFile, JSON.stringify(this.config, null, 2));
    };
    Deployer.prototype.deployServerSideProject = function () {
        var deployPath = this.config.deployPath + "/" + this.config.projectName;
        var isAlreadyRunning = fs.existsSync(deployPath);
        var execOption = { cwd: this.cloningPath };
        FsUtil_1.FsUtil.copy(this.cloningPath + "/package.json", this.cloningPath + "/build/api/src/package.json");
        CmdUtil_1.CmdUtil.execSync("npm install", execOption);
        CmdUtil_1.CmdUtil.execSync("gulp deploy", execOption);
        CmdUtil_1.CmdUtil.execSync("npm install --production", { cwd: this.cloningPath + "/build/api/src" });
        execOption.cwd = deployPath;
        if (isAlreadyRunning) {
            CmdUtil_1.CmdUtil.execSync("docker-compose stop -t 5", execOption);
            CmdUtil_1.CmdUtil.execSync("docker-compose down", execOption);
            CmdUtil_1.CmdUtil.execSync("rm -Rf " + deployPath);
        }
        FsUtil_1.FsUtil.rename(this.cloningPath + "/build", deployPath);
        CmdUtil_1.CmdUtil.execSync("docker-compose up -d", execOption);
        CmdUtil_1.CmdUtil.execSync("rm -Rf " + this.cloningPath);
    };
    Deployer.prototype.deployClientSideProject = function () {
        var _this = this;
        var deployPath = this.config.deployPath + "/" + this.config.projectName;
        var isAlreadyRunning = fs.existsSync(deployPath);
        var execOption = { cwd: this.cloningPath };
        var buildPath = this.cloningPath + '/build';
        var confFile = this.config.ssl ? 'https.conf' : 'http.conf';
        CmdUtil_1.CmdUtil.execSync("npm install", execOption);
        if (fs.existsSync(this.cloningPath + "/bower.json")) {
            CmdUtil_1.CmdUtil.execSync("bower install", execOption);
        }
        CmdUtil_1.CmdUtil.execSync("gulp deploy", execOption);
        CmdUtil_1.CmdUtil.execSync("npm install --production", { cwd: buildPath + "/app/server" });
        if (this.config.lbPath) {
            FsUtil_1.FsUtil.rename(buildPath + "/docker/compose-prod-lb.yml", buildPath + "/docker-compose.yml");
            if (fs.existsSync(buildPath + "/" + this.config.projectName + ".conf")) {
                Util_1.Util.prompt({
                    name: 'ow',
                    type: 'confirm',
                    message: "Overwrite " + this.config.projectName + ".conf? "
                }).then(function (answer) {
                    if (answer.ow) {
                        FsUtil_1.FsUtil.remove(_this.config.lbPath + "/conf.d/" + _this.config.projectName + ".conf");
                        FsUtil_1.FsUtil.rename(buildPath + "/docker/nginx/load-balancer/" + confFile, _this.config.lbPath + "/conf.d/" + _this.config.projectName + ".conf");
                        _this.showUpdateWarning = true;
                    }
                });
            }
            else {
                FsUtil_1.FsUtil.rename(buildPath + "/docker/nginx/load-balancer/" + confFile, this.config.lbPath + "/conf.d/" + this.config.projectName + ".conf");
                this.showUpdateWarning = true;
            }
        }
        else {
            FsUtil_1.FsUtil.rename(buildPath + "/docker/compose-prod-sa.yml", buildPath + "/docker-compose.yml");
            FsUtil_1.FsUtil.mkdir(buildPath + "/nginx");
            FsUtil_1.FsUtil.rename(buildPath + "/docker/nginx/ssl", buildPath + "/nginx/ssl");
            FsUtil_1.FsUtil.rename(buildPath + "/docker/nginx/stand-alone/" + confFile, buildPath + "/nginx/nginx.conf");
            FsUtil_1.FsUtil.rename(buildPath + "/docker/nginx/stand-alone/Dockerfile", buildPath + "/nginx/Dockerfile");
        }
        FsUtil_1.FsUtil.rename(buildPath + "/docker/pm2", buildPath + "/pm2");
        FsUtil_1.FsUtil.rename(buildPath + "/app", buildPath + "/pm2/app");
        if (this.config.lbPath && this.config.ssl) {
            FsUtil_1.FsUtil.rename(buildPath + "/docker/nginx/ssl", buildPath + "/pm2/app/ssl");
        }
        FsUtil_1.FsUtil.remove(buildPath + "/docker", buildPath + "/tmp");
        execOption.cwd = deployPath;
        if (isAlreadyRunning) {
            CmdUtil_1.CmdUtil.execSync("docker-compose stop -t 5", execOption);
            CmdUtil_1.CmdUtil.execSync("docker-compose down", execOption);
            CmdUtil_1.CmdUtil.execSync("rm -Rf " + deployPath);
        }
        FsUtil_1.FsUtil.rename(buildPath, deployPath);
        CmdUtil_1.CmdUtil.execSync("docker-compose up -d", execOption);
        CmdUtil_1.CmdUtil.execSync("rm -Rf " + this.cloningPath);
        if (this.showUpdateWarning) {
            // todo update load balancer compose file automatically
            this.showLbWarning();
        }
    };
    Deployer.prototype.showLbWarning = function () {
        var prefix = DockerUtil_1.DockerUtil.getComposicName(this.config.projectName);
        var points = [];
        if (this.isClientSide) {
            points.push("- Add '" + prefix + "_network'  to the load balancer's networks");
            points.push("- Add '" + prefix + "_web_1'    to the load balancer's external_links");
            if (this.config.ssl) {
                points.push("- Add ssl directory mounting to the load balancer's volumes option");
            }
        }
        points.push("- Restart your NGinx container for the " + this.config.projectName + ".conf file to take effect!\n");
        Log_1.Log.warning("\nWARNING! Do NOT forget to\n\t" + points.join('\n\t'));
    };
    Deployer.getProjectName = function (url) {
        var _a = /.+\/(.+)\/(.+)\.git$/.exec(url), group = _a[1], project = _a[2];
        return group + "-" + project;
    };
    Deployer.getDeployConfig = function (args) {
        if (CmdUtil_1.CmdUtil.execSync("gulp -v").code) {
            Log_1.Log.error('You must install gulp-cli!');
            CmdUtil_1.CmdUtil.execSync("sudo npm install -g gulp-cli");
        }
        var config = {
            history: [],
            deployPath: "app",
            ssl: true
        };
        if (!args[0]) {
            Log_1.Log.error('Invalid file name or HTTP url of remote repository');
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        Log_1.Log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
        if (fs.existsSync(args[0])) {
            _.assign(config, Deployer.fetchConfig(args[0]));
            Deployer.ConfigFile = config.projectName + ".json";
            return Promise.resolve(config);
        }
        else {
            config.repositoryUrl = args[0];
            config.projectName = Deployer.getProjectName(config.repositoryUrl);
            Deployer.ConfigFile = config.projectName + ".json";
            if (fs.existsSync(config.projectName + ".json")) {
                _.assign(config, Deployer.fetchConfig(config.projectName + ".json"));
                return Promise.resolve(config);
            }
            return Util_1.Util.prompt([
                {
                    type: 'confirm',
                    name: 'ssl',
                    message: 'Use ssl? '
                },
                {
                    type: 'input',
                    name: 'lbPath',
                    message: 'Path to the nginx conf.d directory (blank = stand alone): '
                }
            ]).then(function (answer) {
                config.lbPath = answer.lbPath;
                config.ssl = answer.ssl;
                return config;
            });
        }
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
