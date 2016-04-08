"use strict";
var yaml = require("yamljs");
var fs = require("fs-extra");
var Util_1 = require("../util/Util");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var Err_1 = require("../cmn/Err");
var Backuper = (function () {
    function Backuper(config) {
        this.config = config;
        var datePostFix = (new GregorianDate_1.GregorianDate()).format('Ymd-His');
        this.backupDir = "backup_" + datePostFix;
        Util_1.Util.fs.mkdir(this.backupDir);
    }
    Backuper.prototype.exportVolume = function (volume, dir) {
        var _this = this;
        var volumeName = this.config.volumePrefix + "_" + volume, containerId;
        Util_1.Util.log.info("Creating backup from " + volume + ":" + dir);
        return Util_1.Util.exec("docker run -v " + volumeName + ":" + dir)
            .then(function (id) {
            containerId = id;
            return Util_1.Util.exec("docker export " + containerId + " " + _this.backupDir + "/" + volume + ".tar");
        })
            .then(function () { return Util_1.Util.exec("docker rm --force --volume " + containerId); });
    };
    Backuper.prototype.backup = function () {
        var _this = this;
        if (!this.config.volumePrefix) {
            return Util_1.Util.log.error('No volume prefix is set for this project');
        }
        if (this.config.prevDeployPath) {
            var composeConfig = yaml.parse(fs.readFileSync(this.config.prevDeployPath, { encoding: 'utf8' }));
            var volumes = Object.keys(composeConfig['volumes']), services = Object.keys(composeConfig['services']), volumeDirectoryMap = {}, jobs = [];
            for (var i = 0, il = services.length; i < il; ++i) {
                for (var j = 0, jl = volumes.length; j < jl; ++j) {
                    var serviceVolumes = composeConfig[services[i]]['volumes'];
                    for (var k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                        var _a = serviceVolumes[k].split(':'), hostVolume = _a[0], containerVolume = _a[1];
                        if (hostVolume == volumes[j]) {
                            volumeDirectoryMap[hostVolume] = containerVolume;
                        }
                    }
                }
            }
            for (var volume in volumeDirectoryMap) {
                if (volumeDirectoryMap.hasOwnProperty(volume)) {
                    jobs.push(this.exportVolume(volume, volumeDirectoryMap[volume]));
                }
            }
            Promise.all(jobs)
                .then(function (result) { return Util_1.Util.exec("tar -cvf " + _this.backupDir + ".tar " + _this.backupDir); })
                .then(function () {
                Util_1.Util.fs.remove(_this.backupDir);
                Util_1.Util.log.info("Backup was generated to " + _this.backupDir + ".tar");
            });
        }
    };
    Backuper.getDeployConfig = function (args) {
        var fileName = args[0], config = {};
        if (/.+\.json$/.exec(fileName)) {
            fileName += '.json';
        }
        if (!fs.existsSync(fileName)) {
            Util_1.Util.log.error("Deploy config file not found: " + fileName);
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        try {
            config = JSON.parse(fs.readFileSync(fileName, { encoding: 'uft8' }));
        }
        catch (e) {
            Util_1.Util.log.error("Deploy config file is corrupted: " + fileName);
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        Promise.resolve(config);
    };
    return Backuper;
}());
exports.Backuper = Backuper;
