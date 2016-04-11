import * as fs from "fs-extra";
import * as YAML from "yamljs";
import {IDeployConfig} from "./Deployer";
import {Util} from "../util/Util";
import {GregorianDate} from "../cmn/date/GregorianDate";
import {Err} from "../cmn/Err";


export class Backuper {
    private static ConfigFile:string;
    private backupName:string;
    private volumePrefix:string;

    constructor(private config:IDeployConfig) {
        var date = new GregorianDate();
        this.backupName = `backup_${date.format('Ymd-His')}`;
        config.history.push({date: date.format('Y/m/d H:i:s'), type: 'backup'});
    }

    public backup() {
        this.volumePrefix = this.config.projectName.replace(/[\W_]/g, '').toLowerCase();
        var composeFilePath = `${this.config.deployPath}/${this.config.projectName}/docker-compose.yml`;
        if (!fs.existsSync(composeFilePath)) {
            return Util.log.error(`docker-compose.yml file does not exist at ${composeFilePath}`);
        }
        var composeConfig = YAML.parse(fs.readFileSync(composeFilePath, {encoding: 'utf8'}));
        var volumes = Object.keys(composeConfig['volumes']),
            services = Object.keys(composeConfig['services']),
            volumeDirectoryMap = {};
        for (var i = 0, il = services.length; i < il; ++i) {
            var service = composeConfig['services'][services[i]];
            for (var j = 0, jl = volumes.length; j < jl; ++j) {
                var serviceVolumes = service['volumes'];
                for (var k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                    var [hostVolume,containerVolume]=serviceVolumes[k].split(':');
                    if (hostVolume == volumes[j]) {
                        volumeDirectoryMap[hostVolume] = containerVolume;
                    }
                }
            }
        }
        var volumeOption = '';
        for (var volume in volumeDirectoryMap) {
            if (volumeDirectoryMap.hasOwnProperty(volume)) {
                var volumeName = `${this.volumePrefix}_${volume}`;
                volumeOption += ` -v ${volumeName}:${volumeDirectoryMap[volume]}`;
                // jobs.push(this.exportVolume(volume, volumeDirectoryMap[volume]));
            }
        }
        Util.execSync(`docker run --name ${this.backupName} ${volumeOption} busybox echo Mounting backup directories...`);
        Util.execSync(`docker export -o ${this.backupName}.tar ${this.backupName}`);
        Util.execSync(`docker rm -fv ${this.backupName}`);
        Util.fs.writeFile(Backuper.ConfigFile, JSON.stringify(this.config, null, 2));
        Util.log.info(`\n\nBackup was create to ${this.backupName}.tar`);
    }

    public static getDeployConfig(args:Array<string>):Promise<IDeployConfig> {
        var fileName = args[0],
            config:IDeployConfig = <IDeployConfig>{};
        if (!fs.existsSync(fileName)) {
            Util.log.error(`Deploy config file not found: ${fileName}`);
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        try {
            config = JSON.parse(fs.readFileSync(fileName, {encoding: 'utf8'}));
        } catch (e) {
            Util.log.error(`Deploy config file is corrupted: ${fileName}`);
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        Backuper.ConfigFile = fileName;
        return Promise.resolve(config);
    }
}