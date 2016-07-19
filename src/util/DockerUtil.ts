import {CmdUtil, IExecOptions} from "./CmdUtil";
import {Util} from "./Util";
import {Question} from "inquirer";
import {Log} from "./Log";
import {OsUtil} from "./OsUtil";
var isRoot = require('is-root');

export class DockerUtil {

    public static cleanup() {
        var execOption:IExecOptions = {
            silent: true
        };
        // removing volumes
        CmdUtil.execSync(`docker volume rm $(docker volume ls -qf dangling=true)`);
        // removing untagged images
        CmdUtil.execSync(`docker rmi $(docker images | grep "^<none>" | awk "{print $3}")`);
    }

    public static installEngine() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install -y apt-transport-https ca-certificates systemctl`);
        CmdUtil.execSync(`apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D`);
        CmdUtil.execSync(`echo "deb https://apt.dockerproject.org/repo ubuntu-${OsUtil.getOsCodeName()} main" > /etc/apt/sources.list.d/docker.list`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get purge lxc-docker`);
        CmdUtil.execSync(`apt-cache policy docker-engine`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install -y linux-image-extra-${CmdUtil.getOutputOf('uname -r')}`);
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get install -y docker-engine`);
        CmdUtil.execSync(`service docker start`);
        CmdUtil.execSync(`systemctl enable docker`);
        CmdUtil.execSync(`docker --version`);
        CmdUtil.execSync(`groupadd docker`);
        CmdUtil.execSync(`usermod -aG docker ${OsUtil.getUserName()}`);
    }

    public static installCompose() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        Util.prompt<{version:string}>(<Question>{
            name: 'version',
            type: 'input',
            message: 'Enter docker-compose version that you wish to install: ',
            default: '1.7.0'
        })
            .then(answer=> {
                if (answer.version) {
                    CmdUtil.execSync(`curl -L https://github.com/docker/compose/releases/download/${answer.version}/docker-compose-${CmdUtil.getOutputOf('uname -s')}-${CmdUtil.getOutputOf('uname -m')} > /tmp/docker-compose`);
                    CmdUtil.execSync(`cp /tmp/docker-compose /usr/local/bin/docker-compose`);
                    CmdUtil.execSync(`chmod +x /usr/local/bin/docker-compose`);
                    CmdUtil.execSync(`docker-compose --version`);
                }
            });

    }

    public static getComposicName(name:string):string {
        return name.replace(/[\W_]/g, '').toLowerCase();
    }

    public static isVolumeDriver(name:string):boolean {
        return name.indexOf('.') === 0 || name.indexOf('/') === 0;
    }
}