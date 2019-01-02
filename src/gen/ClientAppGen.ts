import { copySync, mkdirSync } from "fs-extra";
import { PlatformConfig } from "../PlatformConfig";
import { Log } from "../util/Log";
import { findInFileAndReplace } from "../util/Util";
import { GitGen } from "./GitGen";
import { IExtProjectConfig } from "./ProjectGen";

export interface IClientAppConfig {
}

export class ClientAppGen {

    constructor(protected config: IExtProjectConfig) {
    }

    public generate() {
        this.cloneTemplate();
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        const templateProjectName = GitGen.getRepoName(templateRepo.client);
        const replacePattern = { [templateProjectName]: dir };
        copySync(`${dir}/resources/gitignore/variantConfig.ts`, `${dir}/src/config/variantConfig.ts`);
        // for installing plugins this folder must exist
        mkdirSync(`${dir}/vesta/cordova/www`);
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
