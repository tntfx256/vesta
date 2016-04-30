"use strict";
var CmdUtil_1 = require("../util/CmdUtil");
var Log_1 = require("../util/Log");
var fs = require("fs");
var Util_1 = require("../util/Util");
var isRoot = require('is-root');
var DockerInstaller = (function () {
    function DockerInstaller() {
    }
    DockerInstaller.prototype.getOsCodeName = function () {
        return CmdUtil_1.CmdUtil.getOutputOf("lsb_release -c").split(':')[1].trim();
    };
    DockerInstaller.prototype.installEngine = function () {
        if (!isRoot())
            return Log_1.Log.error('You must run this command as root!');
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get install apt-transport-https ca-certificates");
        CmdUtil_1.CmdUtil.execSync("apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D");
        fs.writeFileSync('/etc/apt/sources.list.d/docker.list', "deb https://apt.dockerproject.org/repo ubuntu-" + this.getOsCodeName() + " main");
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get purge lxc-docker");
        CmdUtil_1.CmdUtil.execSync("apt-cache policy docker-engine");
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get install linux-image-extra-" + CmdUtil_1.CmdUtil.getOutputOf('uname -r'));
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get install -y docker-engine");
        CmdUtil_1.CmdUtil.execSync("service docker start");
        CmdUtil_1.CmdUtil.execSync("systemctl enable docker");
        CmdUtil_1.CmdUtil.execSync("docker --version");
        Util_1.Util.prompt({
            name: 'username',
            type: 'input',
            message: 'Enter username  to be added to docker group'
        })
            .then(function (answer) {
            if (answer.username) {
                CmdUtil_1.CmdUtil.execSync("groupadd docker");
                CmdUtil_1.CmdUtil.execSync("usermod -aG docker " + answer.username);
            }
        });
    };
    DockerInstaller.prototype.installCompose = function () {
        Util_1.Util.prompt({
            name: 'version',
            type: 'input',
            message: 'Enter docker-compose version that you wish to install: '
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
    DockerInstaller.prototype.installSwarm = function () {
    };
    DockerInstaller.prototype.joinSwarm = function () {
    };
    return DockerInstaller;
}());
exports.DockerInstaller = DockerInstaller;
