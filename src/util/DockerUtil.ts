import * as fs from "fs";
import * as path from "path";
import {CmdUtil, IExecOptions} from "./CmdUtil";
import {Util} from "./Util";
import {Question} from "inquirer";
import {Log} from "./Log";
import {OsUtil} from "./OsUtil";
import {IDeployConfig} from "../deploy/Deployer";
let isRoot = require('is-root');

interface IContainerInfo {
    id: string;
    name: string;
    status: string;
    ports: Array<string>;
}

export class DockerUtil {

    public static cleanup() {
        // removing volumes
        CmdUtil.execSync(`docker volume rm $(docker volume ls -qf dangling=true)`);
        // removing untagged images
        CmdUtil.execSync(`docker rmi $(docker images | grep "^<none>" | awk "{print $3}")`);
    }

    public static installEngine() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        const osCodeName = OsUtil.getOsCodeName();
        CmdUtil.execSync(`apt-get update -y`);
        CmdUtil.execSync(`apt-get remove docker docker-engine`);
        if (osCodeName.toLowerCase() === 'trusty') {
            const kernel = OsUtil.getKernelVersion();
            CmdUtil.execSync(`apt-get install linux-image-extra-${kernel} linux-image-extra-virtual`);
        }
        CmdUtil.execSync(`apt-get install -y apt-transport-https ca-certificates curl software-properties-common`);
        CmdUtil.execSync(`curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -`);
        CmdUtil.execSync(`apt-key fingerprint 0EBFCD88`);
        CmdUtil.execSync(`add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu ${osCodeName} stable"`);
        CmdUtil.execSync(`apt-get update -y`);
        // CmdUtil.execSync(`apt-get install -y docker-ce`);
        CmdUtil.execSync(`apt-cache madison docker-ce`);
        // CmdUtil.execSync(`apt-get install -y docker-ce=<version>`);
        Log.info("Use 'apt-get install docker-ce=<version>' to install");
        Log.info("Use 'usermod -aG docker <username>' to add user to docker group");
    }

    public static installCompose() {
        if (!isRoot()) return Log.error('You must run this command as root!');
        Util.prompt<{ version: string }>(<Question>{
            name: 'version',
            type: 'input',
            message: 'Enter docker-compose version that you wish to install: ',
            default: '1.13.0'
        })
            .then(answer => {
                if (answer.version) {
                    CmdUtil.execSync(`curl -L https://github.com/docker/compose/releases/download/${answer.version}/docker-compose-${CmdUtil.getOutputOf('uname -s')}-${CmdUtil.getOutputOf('uname -m')} > /tmp/docker-compose`);
                    CmdUtil.execSync(`cp /tmp/docker-compose /usr/local/bin/docker-compose`);
                    CmdUtil.execSync(`chmod +x /usr/local/bin/docker-compose`);
                    CmdUtil.execSync(`docker-compose --version`);
                }
            });

    }

    public static getContainerName(name: string): string {
        return name.replace(/[\W_]/g, '').toLowerCase();
    }

    public static isVolumeDriver(name: string): boolean {
        return name.indexOf('.') === 0 || name.indexOf('/') === 0;
    }

    public static getIpPorts(containerNames: string) {
        CmdUtil.getOutputOf(`docker ps --filter 'name=${containerNames}'`);
    }

    public static up(path: string) {
        if (path) {
            try {
                let options = <IDeployConfig>JSON.parse(fs.readFileSync(path, {encoding: 'utf-8'}));
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        CmdUtil.execSync('docker-compose up -d');
    }

    public static getContainersInfo(filter?: string): Promise<Array<IContainerInfo>> {
        let command = `docker ps`;
        if (filter) {
            command += ` --filter ${filter}`;
        }
        return CmdUtil.getResult(command).then(output => {
            let data: Array<IContainerInfo> = [];
            let lines = output.split(/\r?\n/);
            for (let i = 1, il = lines.length; i < il; ++i) {
                if (!lines[i]) continue;
                let parts = lines[i].split(/\s\s+/);
                data.push({id: parts[0], name: parts[6], status: parts[4], ports: parts[5].split(',')});
            }
            data = data.sort((a, b) => a.name > b.name ? 1 : -1);
            return data;
        });
    }

    public static ps(file: string) {
        if (file && fs.existsSync(file)) {
            process.chdir(path.parse(file).dir);
            try {
                let options = <IDeployConfig>JSON.parse(fs.readFileSync(file, {encoding: 'utf-8'}));
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        let wd = DockerUtil.getContainerName(path.parse(process.cwd()).base);
        DockerUtil.getContainersInfo(`name=${wd}`).then(info => {
            let rows = [];
            for (let i = 0, il = info.length; i < il; ++i) {
                let container = info[i];
                rows.push([container.id, container.name, container.status, container.ports.join(', ')]);
            }
            CmdUtil.table(['ID', 'NAME', 'STATUS', 'PORT'], rows);
        });
    }

    public static down(file: string) {
        if (file && fs.existsSync(file)) {
            process.chdir(path.parse(file).dir);
            try {
                let options = <IDeployConfig>JSON.parse(fs.readFileSync(file, {encoding: 'utf-8'}));
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        CmdUtil.execSync('docker-compose down');
    }

    public static scale(file: string, scaleTo?: number) {
        if (file && fs.existsSync(file)) {
            process.chdir(path.parse(file).dir);
            try {
                let options = <IDeployConfig>JSON.parse(fs.readFileSync(file, {encoding: 'utf-8'}));
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        if (!scaleTo) return DockerUtil.ps(file);
        CmdUtil.execSync(`docker-compose scale api=${scaleTo}`);
        let containerName = DockerUtil.getContainerName(path.parse(process.cwd()).base);
        DockerUtil.getContainersInfo(`name=${containerName}`).then(info => {
            let apiContainerName = `${containerName}_api`;
            let apiContainersInfo = [];
            for (let i = info.length; i--;) {
                if (info[i].name.indexOf(apiContainerName) == 0) {
                    apiContainersInfo.push(info[i]);
                }
            }
            console.log(`${apiContainerName} has been scaled to ${apiContainersInfo.length}`);
            let inspectPromises = [];
            let ports = [];
            apiContainersInfo.forEach(info => {
                try {
                    for (let i = info.ports.length; i--;) {
                        if (info.ports[i].indexOf('3000/tcp') > 0) {
                            ports.push(/.+:(\d+)-/.exec(info.ports[i])[1]);
                            inspectPromises.push(CmdUtil.getResult(`docker inspect ${info.id}`).then(result => /IPAddress.+"(.+)"/.exec(result)[1]));
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            Promise.all(inspectPromises).then(result => {
                let upstream = ``;
                for (let i = result.length; i--;) {
                    upstream += `  server ${result[i]}:${ports[i]};\n`; // fail_timeout=5s max_fails=3
                }
                console.log(`Replace upstream part of you nginx config file with\n`, upstream);
            });
        });
    }
}