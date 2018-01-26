import { Culture } from "@vesta/core";
import { existsSync, readFileSync } from "fs";
import * as YAML from "yamljs";
import { execute } from "../util/CmdUtil";
import { DockerUtil } from "../util/DockerUtil";
import { Log } from "../util/Log";
import { IDeployConfig } from "./Deployer";

export class Backuper {
    private backupName: string;
    private volumePrefix: string;

    constructor(private config: IDeployConfig) {
        const date = Culture.getDateTimeInstance();
        this.backupName = `backup_${date.format("Ymd-His")}`;
    }

    public backup() {
        this.volumePrefix = DockerUtil.getContainerName(this.config.projectName);
        const composeFilePath = `${this.config.deployPath}/${this.config.projectName}/docker-compose.yml`;
        if (!existsSync(composeFilePath)) {
            return Log.error(`docker-compose.yml file does not exist at ${composeFilePath}`);
        }
        const composeConfig = YAML.parse(readFileSync(composeFilePath, { encoding: "utf8" }));
        const volumes = Object.keys(composeConfig.volumes);
        const services = Object.keys(composeConfig.services);
        const volumeDirectoryMap = {};
        for (let i = 0, il = services.length; i < il; ++i) {
            const service = composeConfig.services[services[i]];
            const serviceVolumes = service.volumes;
            for (let k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                const volumeMap = serviceVolumes[k].split(":");
                volumeDirectoryMap[volumeMap[0]] = volumeMap[1];
            }
        }
        const volumeOption = [];
        const dirsToBackup = [];
        for (const volume in volumeDirectoryMap) {
            if (volumeDirectoryMap.hasOwnProperty(volume)) {
                if (!DockerUtil.isVolumeDriver(volume)) {
                    const volumeName = `${this.volumePrefix}_${volume}`;
                    volumeOption.push(`-v ${volumeName}:${volumeDirectoryMap[volume]}`);
                }
                dirsToBackup.push(volumeDirectoryMap[volume]);
            }
        }
        execute(`docker run ${volumeOption.join(" ")} --name ${this.backupName} busybox tar -cvf ${this.backupName}.tar ${dirsToBackup.join(" ")}`);
        execute(`docker cp ${this.backupName}:/${this.backupName}.tar ./${this.backupName}.tar`);
        execute(`docker rm -fv ${this.backupName}`);
        Log.info(`\n\nBackup was create to ${this.backupName}.tar`);
    }
}
