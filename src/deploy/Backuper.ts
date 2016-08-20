import * as fs from "fs-extra";
import * as path from "path";
import * as YAML from "yamljs";
import * as _ from "lodash";
import {IDeployConfig, Deployer} from "./Deployer";
import {FsUtil} from "../util/FsUtil";
import {Log} from "../util/Log";
import {CmdUtil} from "../util/CmdUtil";
import {DockerUtil} from "../util/DockerUtil";
import {Err} from "vesta-util/Err";
import {GregorianDate} from "vesta-datetime-gregorian/GregorianDate";

export class Backuper {
    private static ConfigFile: string;
    private backupName: string;
    private volumePrefix: string;

    constructor(private config: IDeployConfig) {
        var date = new GregorianDate();
        this.backupName = `backup_${date.format('Ymd-His')}`;
        config.history.push({date: date.format('Y/m/d H:i:s'), type: 'backup'});
    }

    public backup() {
        this.volumePrefix = DockerUtil.getContainerName(this.config.projectName);
        var composeFilePath = `${this.config.deployPath}/${this.config.projectName}/docker-compose.yml`;
        if (!fs.existsSync(composeFilePath)) {
            return Log.error(`docker-compose.yml file does not exist at ${composeFilePath}`);
        }
        var composeConfig = YAML.parse(fs.readFileSync(composeFilePath, {encoding: 'utf8'}));
        var volumes = Object.keys(composeConfig['volumes']),
            services = Object.keys(composeConfig['services']),
            volumeDirectoryMap = {};
        for (var i = 0, il = services.length; i < il; ++i) {
            var service = composeConfig['services'][services[i]];
            var serviceVolumes = service['volumes'];
            for (var k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                var volumeMap = serviceVolumes[k].split(':');
                volumeDirectoryMap[volumeMap[0]] = volumeMap[1];
            }
        }
        var volumeOption = [],
            dirsToBackup = [];
        for (var volume in volumeDirectoryMap) {
            if (volumeDirectoryMap.hasOwnProperty(volume)) {
                if (!DockerUtil.isVolumeDriver(volume)) {
                    var volumeName = `${this.volumePrefix}_${volume}`;
                    volumeOption.push(`-v ${volumeName}:${volumeDirectoryMap[volume]}`);
                }
                dirsToBackup.push(volumeDirectoryMap[volume]);
            }
        }
        CmdUtil.execSync(`docker run ${volumeOption.join(' ')} --name ${this.backupName} busybox tar -cvf ${this.backupName}.tar ${dirsToBackup.join(' ')}`);
        CmdUtil.execSync(`docker cp ${this.backupName}:/${this.backupName}.tar ./${this.backupName}.tar`);
        CmdUtil.execSync(`docker rm -fv ${this.backupName}`);
        FsUtil.writeFile(Backuper.ConfigFile, JSON.stringify(this.config, null, 2));
        Log.info(`\n\nBackup was create to ${this.backupName}.tar`);
    }

    public static getDeployConfig(args: Array<string>): Promise<IDeployConfig> {
        var fileName: string,
            config: IDeployConfig = <IDeployConfig>{history: []};
        if (args.length) {
            fileName = args[0];
            if (!fs.existsSync(fileName)) {
                Log.error(`Deploy config file not found: ${fileName}`);
                return Promise.reject(new Err(Err.Code.WrongInput));
            }
            _.assign(config, Deployer.fetchConfig(fileName));
        } else {
            let cwd = process.cwd();
            config.projectName = path.basename(cwd);
            config.deployPath = path.dirname(cwd);
            fileName = `${config.projectName}.json`;
            if (fs.existsSync(fileName)) {
                _.assign(config, Deployer.fetchConfig(fileName));
            }
        }
        Backuper.ConfigFile = fileName;
        return Promise.resolve(config);
    }
}