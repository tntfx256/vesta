export interface IProjectConfigRepository {
    baseUrl: string;
    group: string;
    common: string;
    express: string;
    ionic: string;
    material: string;
    cpanel: string;
}

export interface IProjectConfig {
    repository: IProjectConfigRepository;
}

export const Config: IProjectConfig = {
    repository: {
        baseUrl: 'https://github.com',
        group: 'VestaRayanAfzar',
        common: 'commonCodeTemplate',
        express: 'expressJsTemplate',
        ionic: 'ionicCordovaTemplate',
        material: 'materialWebTemplate',
        cpanel: 'material-cpanel-template',
    }
};