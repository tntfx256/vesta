export interface IProjectConfigRepository {
    baseUrl:string;
    group:string;
    common:string;
    express:string;
    ionic:string;
    material:string;
}

export interface IProjectConfig {
    repository:IProjectConfigRepository;
}

export var Config:IProjectConfig = {
    repository: {
        baseUrl: 'https://github.com',
        group: 'hbtb',
        common: 'commonCodeTemplate',
        express: 'expressJsTemplate',
        ionic: 'ionicCordovaTemplate',
        material: 'materialWebTemplate'
    }
};