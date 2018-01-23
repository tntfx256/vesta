import { PlatformConfig } from "../../PlatformConfig";
import { copy, mkdir } from "../../util/FsUtil";
import { findInFileAndReplace } from "../../util/Util";
import { GitGen } from "../file/GitGen";
import { Vesta } from "../file/Vesta";
import { IExtProjectConfig } from "../ProjectGen";
import { Log } from "../../util/Log";

export interface IClientAppConfig {
}

export class ClientAppGen {
    protected vesta: Vesta;

    public static getGeneratorConfig(): Promise<IClientAppConfig> {
        return Promise.resolve({} as IClientAppConfig);
    }

    constructor(protected config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance(config);
    }

    public generate() {
        this.cloneTemplate();
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        const templateProjectName = GitGen.getRepoName(this.vesta.isAdminPanel ? templateRepo.admin : templateRepo.client);
        const replacePattern = {};
        replacePattern[templateProjectName] = dir;
        copy(`${dir}/resources/gitignore/config.var.ts`, `${dir}/src/client/app/config/config.var.ts`);
        findInFileAndReplace(`${dir}/src/client/app/config/config.ts`, replacePattern);
        mkdir(`${dir}/vesta/client/cordova/www`); // for installing plugins this folder must exist
        findInFileAndReplace(`${dir}/vesta/client/cordova/config.xml`, replacePattern);
    }

    private cloneTemplate() {
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        try {
            GitGen.clone(this.vesta.isAdminPanel ? templateRepo.admin : templateRepo.client, dir);
        } catch (e) {
            Log.error(e);
            process.exit();
        }
    }
}
