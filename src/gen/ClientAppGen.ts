import { PlatformConfig } from "../PlatformConfig";
import { copy, mkdir } from "../util/FsUtil";
import { Log } from "../util/Log";
import { findInFileAndReplace } from "../util/Util";
import { GitGen } from "./GitGen";
import { IExtProjectConfig } from "./ProjectGen";

export interface IClientAppConfig {
}

export class ClientAppGen {

    public static getGeneratorConfig(): Promise<IClientAppConfig> {
        return Promise.resolve({} as IClientAppConfig);
    }
    constructor(protected config: IExtProjectConfig) {
    }

    public generate() {
        this.cloneTemplate();
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        const templateProjectName = GitGen.getRepoName(templateRepo.client);
        const replacePattern = { [templateProjectName]: dir };
        copy(`${dir}/resources/gitignore/variantConfig.ts`, `${dir}/src/app/config/variantConfig.ts`);
        mkdir(`${dir}/vesta/cordova/www`); // for installing plugins this folder must exist
        findInFileAndReplace(`${dir}/vesta/cordova/config.xml`, replacePattern);
    }

    private cloneTemplate() {
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        try {
            GitGen.clone(templateRepo.client, dir);
        } catch (e) {
            Log.error(e);
            process.exit();
        }
    }
}
