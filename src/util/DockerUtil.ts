import * as fs from "fs";
import { Question } from "inquirer";
import * as path from "path";
import { IDeployConfig } from "../deploy/Deployer";
import { execute, getOutputOf, table } from "./CmdUtil";
import { Log } from "./Log";
import { ask, getKernelVersion, getOsCodeName } from "./Util";

// tslint:disable-next-line:no-var-requires
const isRoot = require("is-root");

interface IContainerInfo {
    id: string;
    name: string;
    status: string;
    ports: string[];
}

export class DockerUtil {

    public static cleanup() {
        // removing volumes
        execute(`docker volume rm $(docker volume ls -qf dangling=true)`);
        // removing untagged images
        execute(`docker rmi $(docker images | grep "^<none>" | awk "{print $3}")`);
    }

    public static installEngine() {
        if (!isRoot()) { return Log.error("You must run this command as root!"); }
        const osCodeName = getOsCodeName();
        execute(`apt-get update -y`);
        try {
            execute(`apt-get remove docker docker-engine`);
        } catch (e) {
            //
        }
        if (osCodeName.toLowerCase() === "trusty") {
            const kernel = getKernelVersion();
            execute(`apt-get install linux-image-extra-${kernel} linux-image-extra-virtual`);
        }
        execute(`apt-get install -y apt-transport-https ca-certificates curl software-properties-common`);
        execute(`curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -`);
        execute(`apt-key fingerprint 0EBFCD88`);
        execute(`add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu ${osCodeName} stable"`);
        execute(`apt-get update -y`);
        // execute(`apt-get install -y docker-ce`);
        execute(`apt-cache madison docker-ce`);
        // execute(`apt-get install -y docker-ce=<version>`);
        Log.info("Use 'apt-get install docker-ce=<version>' to install");
        Log.info("Use 'usermod -aG docker <username>' to add user to docker group");
    }

    public static installCompose() {
        if (!isRoot()) { return Log.error("You must run this command as root!"); }
        ask<{ version: string }>({
            default: "1.13.0",
            message: "Enter docker-compose version that you wish to install: ",
            name: "version",
            type: "input",
        } as Question)
            .then((answer) => {
                if (answer.version) {
                    execute(`curl -L https://github.com/docker/compose/releases/download/${answer.version}/docker-compose-${getOutputOf("uname -s")}-${getOutputOf("uname -m")} > /tmp/docker-compose`);
                    execute(`cp /tmp/docker-compose /usr/local/bin/docker-compose`);
                    execute(`chmod +x /usr/local/bin/docker-compose`);
                    execute(`docker-compose --version`);
                }
            });

    }

    public static getContainerName(name: string): string {
        return name.replace(/[\W_]/g, "").toLowerCase();
    }

    public static isVolumeDriver(name: string): boolean {
        return name.indexOf(".") === 0 || name.indexOf("/") === 0;
    }

    public static up(filePath: string) {
        if (filePath) {
            try {
                const options = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" })) as IDeployConfig;
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        execute("docker-compose up -d");
    }

    public static getContainersInfo(filter?: string): IContainerInfo[] {
        let command = `docker ps`;
        if (filter) {
            command += ` --filter ${filter}`;
        }
        const output = execute(command);
        let data: IContainerInfo[] = [];
        const lines = output.split(/\r?\n/);
        for (let i = 1, il = lines.length; i < il; ++i) {
            if (!lines[i]) { continue; }
            const parts = lines[i].split(/\s\s+/);
            data.push({ id: parts[0], name: parts[6], status: parts[4], ports: parts[5].split(",") });
        }
        data = data.sort((a, b) => a.name > b.name ? 1 : -1);
        return data;
    }

    public static ps(file: string) {
        if (file && fs.existsSync(file)) {
            process.chdir(path.parse(file).dir);
            try {
                const options = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" })) as IDeployConfig;
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        const wd = DockerUtil.getContainerName(path.parse(process.cwd()).base);
        const info = DockerUtil.getContainersInfo(`name=${wd}`);
        const rows = [];
        for (let i = 0, il = info.length; i < il; ++i) {
            const container = info[i];
            rows.push([container.id, container.name, container.status, container.ports.join(", ")]);
        }
        table(["ID", "NAME", "STATUS", "PORT"], rows);
    }

    public static down(file: string) {
        if (file && fs.existsSync(file)) {
            process.chdir(path.parse(file).dir);
            try {
                const options = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" })) as IDeployConfig;
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        execute("docker-compose down");
    }

    public static scale(file: string, scaleTo?: number) {
        if (file && fs.existsSync(file)) {
            process.chdir(path.parse(file).dir);
            try {
                const options = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" })) as IDeployConfig;
                process.chdir(options.deployPath);
            } catch (e) {
                Log.error(`Error reading deployed file: ${e.message}`);
            }
        }
        if (!scaleTo) { return DockerUtil.ps(file); }
        execute(`docker-compose scale api=${scaleTo}`);
        const containerName = DockerUtil.getContainerName(path.parse(process.cwd()).base);
        const info = DockerUtil.getContainersInfo(`name=${containerName}`);
        const apiContainerName = `${containerName}_api`;
        const apiContainersInfo = [];
        for (let i = info.length; i--;) {
            if (info[i].name.indexOf(apiContainerName) === 0) {
                apiContainersInfo.push(info[i]);
            }
        }
        Log.info(`${apiContainerName} has been scaled to ${apiContainersInfo.length}`);
        const inspections = [];
        const ports = [];
        apiContainersInfo.forEach((containerInfo) => {
            try {
                for (let i = containerInfo.ports.length; i--;) {
                    if (containerInfo.ports[i].indexOf("3000/tcp") > 0) {
                        ports.push(/.+:(\d+)-/.exec(containerInfo.ports[i])[1]);
                        const result = execute(`docker inspect ${containerInfo.id}`);
                        inspections.push(/IPAddress.+"(.+)"/.exec(result)[1]);
                    }
                }
                let upstream = ``;
                for (let i = inspections.length; i--;) {
                    upstream += `  server ${inspections[i]}:${ports[i]};\n`; // fail_timeout=5s max_fails=3
                }
                Log.info(`Replace upstream part of you nginx config file with\n${upstream}`);
            } catch (err) {
                Log.error(err);
            }
        });
    }
}
