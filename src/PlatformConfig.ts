import { dirname } from "path";
export interface IPlatformRepositoryConfig {
  api: string;
  client: string;
  cmn: string;
  // admin: string;
  module: string;
}

export interface IPlatformConfig {
  repository: IPlatformRepositoryConfig;
  root: string;
}

export class PlatformConfig {
  public static getRepository() {
    return PlatformConfig.config.repository;
  }

  public static getRoot() {
    return PlatformConfig.config.root;
  }

  public static init(config?: IPlatformConfig) {
    PlatformConfig.config = { ...config };
    PlatformConfig.config.root = dirname(__dirname);
  }

  private static config: IPlatformConfig;

  private constructor() {}
}
