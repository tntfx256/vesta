import {CmdUtil} from "../util/CmdUtil";
import {Log} from "../util/Log";
import * as fs from "fs";
var isRoot = require('is-root');

export class DockerInstaller {

    constructor(private config) {
    }

    private getDockerRepoName() {
        return 'wily';
    }

    public installEngine() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install apt-transport-https ca-certificates`);
        CmdUtil.execSync(`apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D`);
        fs.writeFileSync('/etc/apt/sources.list.d/docker.list', `deb https://apt.dockerproject.org/repo ubuntu-${this.getDockerRepoName()} main`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get purge lxc-docker`);
        CmdUtil.execSync(`apt-cache policy docker-engine`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install linux-image-extra-${CmdUtil.getOutputOf('uname -r')}`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install -y docker-engine`);
        CmdUtil.execSync(`service docker start`);
        CmdUtil.execSync(`systemctl enable docker`);
        CmdUtil.execSync(`groupadd docker`);
        CmdUtil.execSync(`usermod -aG docker ${CmdUtil.getOutputOf('whoami')}`);
    }

    public installCompose() {
    }

    public installSwarm() {

    }

    public joinSwarm() {

    }
}