import * as fs from "fs-extra";
import * as YAML from "yamljs";
import {IDeployConfig} from "./Deployer";
import {Log} from "../util/Log";
import {DockerUtil} from "../util/DockerUtil";
import {execute} from "../util/CmdUtil";
import {Culture} from "../cmn/core/Culture";

export class Backuper {
    private backupName: string;
    private volumePrefix: string;

    constructor(private config: IDeployConfig) {
        let date = Culture.getDateTimeInstance();
        this.backupName = `backup_${date.format('Ymd-His')}`;
    }

    public backup() {
        this.volumePrefix = DockerUtil.getContainerName(this.config.projectName);
        let composeFilePath = `${this.config.deployPath}/${this.config.projectName}/docker-compose.yml`;
        if (!fs.existsSync(composeFilePath)) {
            return Log.error(`docker-compose.yml file does not exist at ${composeFilePath}`);
        }
        let composeConfig = YAML.parse(fs.readFileSync(composeFilePath, {encoding: 'utf8'}));
        let volumes = Object.keys(composeConfig['volumes']),
            services = Object.keys(composeConfig['services']),
            volumeDirectoryMap = {};
        for (let i = 0, il = services.length; i < il; ++i) {
            let service = composeConfig['services'][services[i]];
            let serviceVolumes = service['volumes'];
            for (let k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                let volumeMap = serviceVolumes[k].split(':');
                volumeDirectoryMap[volumeMap[0]] = volumeMap[1];
            }
        }
        let volumeOption = [],
            dirsToBackup = [];
        for (let volume in volumeDirectoryMap) {
            if (volumeDirectoryMap.hasOwnProperty(volume)) {
                if (!DockerUtil.isVolumeDriver(volume)) {
                    let volumeName = `${this.volumePrefix}_${volume}`;
                    volumeOption.push(`-v ${volumeName}:${volumeDirectoryMap[volume]}`);
                }
                dirsToBackup.push(volumeDirectoryMap[volume]);
            }
        }
        execute(`docker run ${volumeOption.join(' ')} --name ${this.backupName} busybox tar -cvf ${this.backupName}.tar ${dirsToBackup.join(' ')}`);
        execute(`docker cp ${this.backupName}:/${this.backupName}.tar ./${this.backupName}.tar`);
        execute(`docker rm -fv ${this.backupName}`);
        Log.info(`\n\nBackup was create to ${this.backupName}.tar`);
    }
}