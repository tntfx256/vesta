export interface IPlatformRepositoryConfig {
    api: string;
    client: string;
    cmn: string;
    cpanel: string;
    module: string;
}

export interface IPlatformConfig {
    repository: IPlatformRepositoryConfig;
}

export class PlatformConfig {
    private static config: IPlatformConfig;

    private constructor() {
    }

    static init(config?: IPlatformConfig) {
        PlatformConfig.config = config;
    }

    static getRepository() {
        return PlatformConfig.config.repository;
    }
}