import { PlatformConfig } from "../../PlatformConfig";
import { copy, mkdir } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { findInFileAndReplace } from "../../util/Util";
import { GitGen } from "../file/GitGen";
import { Vesta } from "../file/Vesta";
import { IExtProjectConfig } from "../ProjectGen";

export interface IClientAppConfig {
}

export class ClientAppGen {

    public static getGeneratorConfig(): Promise<IClientAppConfig> {
        return Promise.resolve({} as IClientAppConfig);
    }

    protected vesta: Vesta;

    constructor(protected config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance(config);
    }

    public generate() {
        this.cloneTemplate();
        const dir = this.config.name;
        const templateRepo = PlatformConfig.getRepository();
        // tslint:disable-next-line:max-line-length
        const templateProjectName = GitGen.getRepoName(this.vesta.isAdminPanel ? templateRepo.admin : templateRepo.client);
        const replacePattern = { [templateProjectName]: dir };
        copy(`${dir}/resources/gitignore/variantConfig.ts`, `${dir}/src/app/config/variantConfig.ts`);
        mkdir(`${dir}/vesta/cordova/www`); // for installing plugins this folder must exist
        findInFileAndReplace(`${dir}/vesta/cordova/config.xml`, replacePattern);
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
