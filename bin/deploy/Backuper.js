"use strict";
var fs = require("fs-extra");
var path = require("path");
var YAML = require("yamljs");
var _ = require("lodash");
var Deployer_1 = require("./Deployer");
var GregorianDate_1 = require("../cmn/date/GregorianDate");
var Err_1 = require("../cmn/Err");
var FsUtil_1 = require("../util/FsUtil");
var Log_1 = require("../util/Log");
var CmdUtil_1 = require("../util/CmdUtil");
var DockerUtil_1 = require("../util/DockerUtil");
var Backuper = (function () {
    function Backuper(config) {
        this.config = config;
        var date = new GregorianDate_1.GregorianDate();
        this.backupName = "backup_" + date.format('Ymd-His');
        config.history.push({ date: date.format('Y/m/d H:i:s'), type: 'backup' });
    }
    Backuper.prototype.backup = function () {
        this.volumePrefix = DockerUtil_1.DockerUtil.getComposicName(this.config.projectName);
        var composeFilePath = this.config.deployPath + "/" + this.config.projectName + "/docker-compose.yml";
        if (!fs.existsSync(composeFilePath)) {
            return Log_1.Log.error("docker-compose.yml file does not exist at " + composeFilePath);
        }
        var composeConfig = YAML.parse(fs.readFileSync(composeFilePath, { encoding: 'utf8' }));
        var volumes = Object.keys(composeConfig['volumes']), services = Object.keys(composeConfig['services']), volumeDirectoryMap = {};
        for (var i = 0, il = services.length; i < il; ++i) {
            var service = composeConfig['services'][services[i]];
            var serviceVolumes = service['volumes'];
            for (var k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                var volumeMap = serviceVolumes[k].split(':');
                volumeDirectoryMap[volumeMap[0]] = volumeMap[1];
            }
        }
        var volumeOption = [], dirsToBackup = [];
        // todo directory nesting (e.g. compose-prod-sa.yml)
        for (var volume in volumeDirectoryMap) {
            if (volumeDirectoryMap.hasOwnProperty(volume)) {
                if (DockerUtil_1.DockerUtil.isVolumeDriver(volume)) {
                    var volumeName = this.volumePrefix + "_" + volume;
                    volumeOption.push("-v " + volumeName + ":" + volumeDirectoryMap[volume]);
                }
                else {
                    volumeOption.push("-v " + volume + ":" + volumeDirectoryMap[volume]);
                }
                dirsToBackup.push(volumeDirectoryMap[volume]);
            }
        }
        CmdUtil_1.CmdUtil.execSync("docker run " + volumeOption.join(' ') + " --name " + this.backupName + " busybox tar -cvf " + this.backupName + ".tar " + dirsToBackup.join(' '));
        CmdUtil_1.CmdUtil.execSync("docker cp " + this.backupName + ":/" + this.backupName + ".tar ./" + this.backupName + ".tar");
        CmdUtil_1.CmdUtil.execSync("docker rm -fv " + this.backupName);
        FsUtil_1.FsUtil.writeFile(Backuper.ConfigFile, JSON.stringify(this.config, null, 2));
        Log_1.Log.info("\n\nBackup was create to " + this.backupName + ".tar");
    };
    Backuper.getDeployConfig = function (args) {
        var fileName, config = { history: [] };
        if (args.length) {
            fileName = args[0];
            if (!fs.existsSync(fileName)) {
                Log_1.Log.error("Deploy config file not found: " + fileName);
                return Promise.reject(new Err_1.Err(Err_1.Err.Code.WrongInput));
            }
            _.assign(config, Deployer_1.Deployer.fetchConfig(fileName));
        }
        else {
            var cwd = process.cwd();
            config.projectName = path.basename(cwd);
            config.deployPath = path.dirname(cwd);
            fileName = config.projectName + ".json";
            if (fs.existsSync(fileName)) {
                _.assign(config, Deployer_1.Deployer.fetchConfig(fileName));
            }
        }
        Backuper.ConfigFile = fileName;
        return Promise.resolve(config);
    };
    return Backuper;
}());
exports.Backuper = Backuper;
