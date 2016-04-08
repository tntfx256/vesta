import * as yaml from "yamljs";
import * as fs from "fs-extra";
import {IDeployConfig} from "./Deployer";
import {Util} from "../util/Util";
import {GregorianDate} from "../cmn/date/GregorianDate";
import {Err} from "../cmn/Err";

export class Backuper {
    private backupDir:string;

    constructor(private config:IDeployConfig) {
        var datePostFix = (new GregorianDate()).format('Ymd-His');
        this.backupDir = `backup_${datePostFix}`;
        Util.fs.mkdir(this.backupDir);
    }

    private exportVolume(volume:string, dir:string):Promise<any> {
        var volumeName = `${this.config.volumePrefix}_${volume}`, containerId;
        Util.log.info(`Creating backup from ${volume}:${dir}`);
        return Util.exec(`docker run -v ${volumeName}:${dir}`)
            .then(id=> {
                containerId = id;
                return Util.exec(`docker export ${containerId} ${this.backupDir}/${volume}.tar`);
            })
            .then(()=>Util.exec(`docker rm --force --volume ${containerId}`))
    }

    public backup() {
        if (!this.config.volumePrefix) {
            return Util.log.error('No volume prefix is set for this project');
        }
        if (this.config.prevDeployPath) {
            var composeConfig = yaml.parse(fs.readFileSync(this.config.prevDeployPath, {encoding: 'utf8'}));
            var volumes = Object.keys(composeConfig['volumes']),
                services = Object.keys(composeConfig['services']),
                volumeDirectoryMap = {},
                jobs = [];
            for (var i = 0, il = services.length; i < il; ++i) {
                for (var j = 0, jl = volumes.length; j < jl; ++j) {
                    var serviceVolumes = composeConfig[services[i]]['volumes'];
                    for (var k = 0, kl = serviceVolumes.length; k < kl; ++k) {
                        var [hostVolume,containerVolume]=serviceVolumes[k].split(':');
                        if (hostVolume == volumes[j]) {
                            volumeDirectoryMap[hostVolume] = containerVolume;
                        }
                    }
                }
            }
            for (var volume in volumeDirectoryMap) {
                if (volumeDirectoryMap.hasOwnProperty(volume)) {
                    jobs.push(this.exportVolume(volume, volumeDirectoryMap[volume]));
                }
            }
            Promise.all(jobs)
                .then(result=>Util.exec(`tar -cvf ${this.backupDir}.tar ${this.backupDir}`))
                .then(()=> {
                    Util.fs.remove(this.backupDir);
                    Util.log.info(`Backup was generated to ${this.backupDir}.tar`);
                });
        }
    }

    public static getDeployConfig(args:Array<string>):Promise<IDeployConfig> {
        var fileName = args[0],
            config:IDeployConfig = <IDeployConfig>{};
        if (/.+\.json$/.exec(fileName)) {
            fileName += '.json';
        }
        if (!fs.existsSync(fileName)) {
            Util.log.error(`Deploy config file not found: ${fileName}`);
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        try {
            config = JSON.parse(fs.readFileSync(fileName, {encoding: 'uft8'}));
        } catch (e) {
            Util.log.error(`Deploy config file is corrupted: ${fileName}`);
            return Promise.reject(new Err(Err.Code.WrongInput));
        }
        Promise.resolve(config);
    }
}