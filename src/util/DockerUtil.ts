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
        CmdUtil.getOutputOf(`docker volume ls -q`, execOption).split('\n').forEach(v=>v && CmdUtil.execSync(`docker volume rm ${v}`));
        CmdUtil.getOutputOf(`docker network ls -q`, execOption).split('\n').forEach(n=>n && CmdUtil.execSync(`docker network rm ${n}`));
    }

    public static installEngine() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        CmdUtil.execSync(`sudo apt-get update -y`);
        CmdUtil.execSync(`sudo apt-get install apt-transport-https ca-certificates`);
        CmdUtil.execSync(`sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D`);
        CmdUtil.execSync(`sudo echo "deb https://apt.dockerproject.org/repo ubuntu-${OsUtil.getOsCodeName()} main" > /etc/apt/sources.list.d/docker.list`);
        CmdUtil.execSync(`sudo apt-get update -y`);
        CmdUtil.execSync(`sudo apt-get purge lxc-docker`);
        CmdUtil.execSync(`apt-cache policy docker-engine`);
        CmdUtil.execSync(`sudo apt-get update -y`);
        CmdUtil.execSync(`sudo apt-get install linux-image-extra-${CmdUtil.getOutputOf('uname -r')}`);
        CmdUtil.execSync(`sudo apt-get update -y`);
        CmdUtil.execSync(`sudo apt-get install -y docker-engine`);
        CmdUtil.execSync(`sudo service docker start`);
        CmdUtil.execSync(`sudo systemctl enable docker`);
        CmdUtil.execSync(`sudo docker --version`);
        Util.prompt<{username:string}>(<Question>{
                name: 'username',
                type: 'input',
                message: 'Enter username  to be added to docker group: '
            })
            .then(answer=> {
                if (answer.username) {
                    CmdUtil.execSync(`sudo groupadd docker`);
                    CmdUtil.execSync(`sudo usermod -aG docker ${answer.username}`);
                }
            });
    }

    public static installCompose() {
        Util.prompt<{version:string}>(<Question>{
                name: 'version',
                type: 'input',
                message: 'Enter docker-compose version that you wish to install: ',
                default: '1.7.0'
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

    public static getComposicName(name:string):string {
        return name.replace(/[\W_]/g, '').toLowerCase();
    }

    public static isVolumeDriver(name:string):boolean {
        return name.indexOf('.') === 0 || name.indexOf('/') === 0;
    }
}