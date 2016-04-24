"use strict";
var CmdUtil_1 = require("../util/CmdUtil");
var Log_1 = require("../util/Log");
var fs = require("fs");
var isRoot = require('is-root');
var DockerInstaller = (function () {
    function DockerInstaller(config) {
        this.config = config;
    }
    DockerInstaller.prototype.getDockerRepoName = function () {
        return 'wily';
    };
    DockerInstaller.prototype.installEngine = function () {
        if (!isRoot())
            return Log_1.Log.error('You must run this command as root!');
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get install apt-transport-https ca-certificates");
        CmdUtil_1.CmdUtil.execSync("apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D");
        fs.writeFileSync('/etc/apt/sources.list.d/docker.list', "deb https://apt.dockerproject.org/repo ubuntu-" + this.getDockerRepoName() + " main");
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get purge lxc-docker");
        CmdUtil_1.CmdUtil.execSync("apt-cache policy docker-engine");
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get install linux-image-extra-" + CmdUtil_1.CmdUtil.getOutputOf('uname -r'));
        CmdUtil_1.CmdUtil.execSync("apt-get update -y");
        CmdUtil_1.CmdUtil.execSync("apt-get install -y docker-engine");
        CmdUtil_1.CmdUtil.execSync("service docker start");
        CmdUtil_1.CmdUtil.execSync("systemctl enable docker");
        CmdUtil_1.CmdUtil.execSync("groupadd docker");
        CmdUtil_1.CmdUtil.execSync("usermod -aG docker " + CmdUtil_1.CmdUtil.getOutputOf('whoami'));
    };
    DockerInstaller.prototype.installCompose = function () {
    };
    DockerInstaller.prototype.installSwarm = function () {
    };
    DockerInstaller.prototype.joinSwarm = function () {
    };
    return DockerInstaller;
}());
exports.DockerInstaller = DockerInstaller;
