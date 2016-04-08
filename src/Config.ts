import {IRepositoryConfig} from "./gen/file/GitGen";

export interface IProjectConfig {
    repository:IRepositoryConfig;
}

export var Config:IProjectConfig = {
    repository: <IRepositoryConfig>{
        baseRepoUrl: 'http://hbtb.ir:8080',
        group: 'vesta'
    }
};