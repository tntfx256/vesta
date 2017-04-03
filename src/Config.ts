export interface IProjectGenRepositoryConfig {
    baseUrl: string;
    group: string;
    common: string;
    express: string;
    ionic: string;
    material: string;
    cpanel: string;
    template: string;
}

export interface IProjectGenConfig {
    repository: IProjectGenRepositoryConfig;
}

export const GenConfig: IProjectGenConfig = {
    repository: {
        baseUrl: 'https://github.com',
        group: 'VestaRayanAfzar',
        common: 'common-code-template',
        express: 'express-api-template',
        ionic: 'ionic-template',
        material: 'material-web-template',
        cpanel: 'material-cpanel-template',
        template: 'vesta-template'
    }
};