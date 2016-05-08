"use strict";
var CmdUtil_1 = require("./CmdUtil");
var Util_1 = require("./Util");
var Log_1 = require("./Log");
var OsUtil_1 = require("./OsUtil");
var isRoot = require('is-root');
var DockerUtil = (function () {
    function DockerUtil() {
    }
    DockerUtil.cleanup = function () {
        var execOption = {
            silent: true
        };
        CmdUtil_1.CmdUtil.getOutputOf("docker volume ls -q", execOption).split('\n').forEach(function (v) { return v && CmdUtil_1.CmdUtil.execSync("docker volume rm " + v); });
        CmdUtil_1.CmdUtil.getOutputOf("docker network ls -q", execOption).split('\n').forEach(function (n) { return n && CmdUtil_1.CmdUtil.execSync("docker network rm " + n); });
    };
    DockerUtil.installEngine = function () {
        if (!isRoot())
            return Log_1.Log.error('You must run this command as root!');
        CmdUtil_1.CmdUtil.execSync("sudo apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("sudo apt-get install apt-transport-https ca-certificates");
        CmdUtil_1.CmdUtil.execSync("sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D");
        CmdUtil_1.CmdUtil.execSync("sudo echo \"deb https://apt.dockerproject.org/repo ubuntu-" + OsUtil_1.OsUtil.getOsCodeName() + " main\" > /etc/apt/sources.list.d/docker.list");
        CmdUtil_1.CmdUtil.execSync("sudo apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("sudo apt-get purge lxc-docker");
        CmdUtil_1.CmdUtil.execSync("apt-cache policy docker-engine");
        CmdUtil_1.CmdUtil.execSync("sudo apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("sudo apt-get install linux-image-extra-" + CmdUtil_1.CmdUtil.getOutputOf('uname -r'));
        CmdUtil_1.CmdUtil.execSync("sudo apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("sudo apt-get install -y docker-engine");
        CmdUtil_1.CmdUtil.execSync("sudo service docker start");
        CmdUtil_1.CmdUtil.execSync("sudo systemctl enable docker");
        CmdUtil_1.CmdUtil.execSync("sudo docker --version");
        Util_1.Util.prompt({
            name: 'username',
            type: 'input',
            message: 'Enter username  to be added to docker group: '
        })
            .then(function (answer) {
            if (answer.username) {
                CmdUtil_1.CmdUtil.execSync("sudo groupadd docker");
                CmdUtil_1.CmdUtil.execSync("sudo usermod -aG docker " + answer.username);
            }
        });
    };
    DockerUtil.installCompose = function () {
        Util_1.Util.prompt({
            name: 'version',
            type: 'input',
            message: 'Enter docker-compose version that you wish to install: ',
            default: '1.7.0'
        })
            .then(function (answer) {
            if (answer.version) {
                CmdUtil_1.CmdUtil.execSync("curl -L https://github.com/docker/compose/releases/download/" + answer.version + "/docker-compose-" + CmdUtil_1.CmdUtil.getOutputOf('uname -s') + "-" + CmdUtil_1.CmdUtil.getOutputOf('uname -m') + " > /tmp/docker-compose");
                CmdUtil_1.CmdUtil.execSync("sudo cp /tmp/docker-compose /usr/local/bin/docker-compose");
                CmdUtil_1.CmdUtil.execSync("sudo chmod +x /usr/local/bin/docker-compose");
                CmdUtil_1.CmdUtil.execSync("docker-compose --version");
            }
        });
    };
    DockerUtil.getComposicName = function (name) {
        return name.replace(/[\W_]/g, '').toLowerCase();
    };
    DockerUtil.isVolumeDriver = function (name) {
        return name.indexOf('.') === 0 || name.indexOf('/') === 0;
    };
    return DockerUtil;
}());
exports.DockerUtil = DockerUtil;
