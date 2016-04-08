import {IRepositoryConfig} from "./gen/file/GitGen";

interface IProjectConfigRepository extends IRepositoryConfig {
    express:string;
    ionic:string;
    material:string;
}

export interface IProjectConfig {
    repository:IProjectConfigRepository;
}

export var Config:IProjectConfig = {
    repository: <IProjectConfigRepository>{
        baseRepoUrl: 'https://github.com',
        group: 'hbtb',
        common: 'commonCodeTemplate',
        express: 'expressJsTemplate',
        ionic: 'ionicCordovaTemplate',
        material: 'materialWebTemplate'
    }
};