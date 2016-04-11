"use strict";
var fs = require("fs-extra");
var YAML = require("yamljs");
var Util_1 = require("../util/Util");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var Err_1 = require("../cmn/Err");
var Backuper = (function () {
    function Backuper(config) {
        this.config = config;
        var date = new GregorianDate_1.GregorianDate();
        this.backupName = "backup_" + date.format('Ymd-His');
        config.history.push({ date: date.format('Y/m/d H:i:s'), type: 'backup' });
    }
    Backuper.prototype.backup = function () {
        this.volumePrefix = this.config.projectName.replace(/[\W_]/g, '').toLowerCase();
        var composeFilePath = this.config.deployPath + "/" + this.config.projectName + "/docker-compose.yml";
        if (!fs.existsSync(composeFilePath)) {
            return Util_1.Util.log.error("docker-compose.yml file does not exist at " + composeFilePath);
        }
        var composeConfig = YAML.parse(fs.readFileSync(composeFilePath, { encoding: 'utf8' }));
        var volumes = Object.keys(composeConfig['volumes']), services = Object.keys(composeConfig['services']), volumeDirectoryMap = {};
        for (var i = 0, il = services.length; i < il; ++i) {
            var service = composeConfig['services'][services[i]];
            for (var j = 0, jl = volumes.length; j < jl; ++j) {
                var serviceVolumes = service['volumes'];
                for (var k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                    var _a = serviceVolumes[k].split(':'), hostVolume = _a[0], containerVolume = _a[1];
                    if (hostVolume == volumes[j]) {
                        volumeDirectoryMap[hostVolume] = containerVolume;
                    }
                }
            }
        }
        var volumeOption = '';
        for (var volume in volumeDirectoryMap) {
            if (volumeDirectoryMap.hasOwnProperty(volume)) {
                var volumeName = this.volumePrefix + "_" + volume;
                volumeOption += " -v " + volumeName + ":" + volumeDirectoryMap[volume];
            }
        }
        Util_1.Util.execSync("docker run --name " + this.backupName + " " + volumeOption + " busybox echo Mounting backup directories...");
        Util_1.Util.execSync("docker export -o " + this.backupName + ".tar " + this.backupName);
        Util_1.Util.execSync("docker rm -fv " + this.backupName);
        Util_1.Util.fs.writeFile(Backuper.ConfigFile, JSON.stringify(this.config, null, 2));
        Util_1.Util.log.info("\n\nBackup was create to " + this.backupName + ".tar");
    };
    Backuper.getDeployConfig = function (args) {
        var fileName = args[0], config = {};
        if (!fs.existsSync(fileName)) {
            Util_1.Util.log.error("Deploy config file not found: " + fileName);
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        try {
            config = JSON.parse(fs.readFileSync(fileName, { encoding: 'utf8' }));
        }
        catch (e) {
            Util_1.Util.log.error("Deploy config file is corrupted: " + fileName);
            return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
        }
        Backuper.ConfigFile = fileName;
        return Promise.resolve(config);
    };
    return Backuper;
}());
exports.Backuper = Backuper;
