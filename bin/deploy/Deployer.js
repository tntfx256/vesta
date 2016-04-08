"use strict";
var fs = require("fs-extra");
var Util_1 = require("../util/Util");
var Err_1 = require("../cmn/Err");
var GitGen_1 = require("../gen/file/GitGen");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var ProjectGen_1 = require("../gen/ProjectGen");
var Deployer = (function () {
    function Deployer(config) {
        this.config = config;
        var _a = /.+\/(.+)\/(.+)\.git$/.exec(config.repositoryUrl), group = _a[1], project = _a[2];
        this.projectName = group + "-" + project;
        Deployer.ConfigFile = this.projectName + ".json";
        if (fs.existsSync(Deployer.ConfigFile)) {
            try {
                var cfg = JSON.parse(fs.readFileSync(Deployer.ConfigFile, { encoding: 'utf8' }));
                config.prevDeployPath = cfg.prevDeployPath;
            }
            catch (e) {
            }
        }
    }
    Deployer.prototype.deploy = function () {
        var _this = this;
        var datePostFix = (new GregorianDate_1.GregorianDate()).format('Ymd-His'), projectName = this.projectName + "_" + datePostFix, deployPath = "/app/" + projectName, config;
        Util_1.Util.fs.mkdir('/app');
        if (fs.existsSync(projectName)) {
            Util_1.Util.fs.remove(projectName);
        }
        if (!this.config.volumePrefix) {
            this.config.volumePrefix = projectName.toLowerCase();
        }
        GitGen_1.GitGen.getRepoUrl(this.config.repositoryUrl)
            .then(function (url) { return GitGen_1.GitGen.clone(url, projectName, 'master'); })
            .then(function () { return Util_1.Util.exec("git submodule foreach git pull origin master", projectName); })
            .then(function () {
            Util_1.Util.fs.copy(projectName + "/resources/gitignore/src/config/setting.var.ts", projectName + "/src/config/setting.var.ts");
            var jsonFile = projectName + "/vesta.json", vesta = {};
            try {
                vesta = JSON.parse(fs.readFileSync(jsonFile, { encoding: 'utf8' }));
                config = vesta.config;
            }
            catch (e) {
            }
        })
            .then(function () { return Util_1.Util.run("npm install", projectName, true); })
            .then(function () { return config.type == ProjectGen_1.ProjectGen.Type.ClientSide ? Util_1.Util.run("bower install", projectName, true) : null; })
            .then(function () { return Util_1.Util.run("gulp prod", projectName, true); })
            .then(function () {
            Util_1.Util.fs.rename(projectName + "/build", deployPath);
            return Util_1.Util.exec("docker-compose build", deployPath);
        })
            .then(function () { return _this.config.prevDeployPath ? Util_1.Util.exec("docker-compose stop -t 2", _this.config.prevDeployPath) : null; })
            .then(function () { return Util_1.Util.exec("docker-compose up -d", deployPath); })
            .then(function () {
            if (_this.config.prevDeployPath) {
                Util_1.Util.exec("docker-compose down --rmi local", _this.config.prevDeployPath)
                    .then(function () { return Util_1.Util.exec("rm -Rf " + _this.config.prevDeployPath); });
            }
            Util_1.Util.exec("rm -Rf " + projectName);
            _this.config.prevDeployPath = deployPath;
            Util_1.Util.fs.writeFile(Deployer.ConfigFile, JSON.stringify(_this.config));
        });
    };
    Deployer.getDeployConfig = function (args) {
        var config = {};
        if (!args[0]) {
            Util_1.Util.log.error('Invalid HTTP url of remote repository');
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        Util_1.Util.log.warning('\nWARNING: Make sure that your `master` branch is updated and contains the final changes!\n');
        config.repositoryUrl = args[0];
        return Promise.resolve(config);
    };
    Deployer.ConfigFile = 'vesta-deploy.json';
    return Deployer;
}());
exports.Deployer = Deployer;
