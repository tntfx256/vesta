import {CmdUtil} from "../util/CmdUtil";
import {Log} from "../util/Log";
import * as fs from "fs";
import {Util} from "../util/Util";
import {Question} from "inquirer";
var isRoot = require('is-root');

export class DockerInstaller {

    constructor() {
    }

    private getOsCodeName() {
        return CmdUtil.getOutputOf(`lsb_release -c`).split(':')[1].trim();
    }

    public installEngine() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install apt-transport-https ca-certificates`);
        CmdUtil.execSync(`apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D`);
        fs.writeFileSync('/etc/apt/sources.list.d/docker.list', `deb https://apt.dockerproject.org/repo ubuntu-${this.getOsCodeName()} main`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get purge lxc-docker`);
        CmdUtil.execSync(`apt-cache policy docker-engine`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install linux-image-extra-${CmdUtil.getOutputOf('uname -r')}`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install -y docker-engine`);
        CmdUtil.execSync(`service docker start`);
        CmdUtil.execSync(`systemctl enable docker`);
        CmdUtil.execSync(`docker --version`);
        Util.prompt<{username:string}>(<Question>{
                name: 'username',
                type: 'input',
                message: 'Enter username  to be added to docker group'
            })
            .then(answer=> {
                if (answer.username) {
                    CmdUtil.execSync(`groupadd docker`);
                    CmdUtil.execSync(`usermod -aG docker ${answer.username}`);
                }
            });
    }

    public installCompose() {
        Util.prompt<{version:string}>(<Question>{
                name: 'version',
                type: 'input',
                message: 'Enter docker-compose version that you wish to install: '
            })
            .then(answer=> {
                if (answer.version) {
                    CmdUtil.execSync(`curl -L https://github.com/docker/compose/releases/download/${answer.version}/docker-compose-${CmdUtil.getOutputOf('uname -s')}-${CmdUtil.getOutputOf('uname -m')} > /tmp/docker-compose`);
                    CmdUtil.execSync(`sudo cp /tmp/docker-compose /usr/local/bin/docker-compose`);
                    CmdUtil.execSync(`sudo chmod +x /usr/local/bin/docker-compose`);
                    CmdUtil.execSync(`docker-compose --version`);
                }
            });

    }

    public installSwarm() {

    }

    public joinSwarm() {

    }
}