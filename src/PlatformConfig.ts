export interface IPlatformRepositoryConfig {
    api: string;
    client: string;
    cmn: string;
    admin: string;
    module: string;
}

export interface IPlatformConfig {
    repository: IPlatformRepositoryConfig;
}

export class PlatformConfig {

    public static getRepository() {
        return PlatformConfig.config.repository;
    }

    public static init(config?: IPlatformConfig) {
        PlatformConfig.config = config;
    }

    private static config: IPlatformConfig;

    private constructor() { }
}
