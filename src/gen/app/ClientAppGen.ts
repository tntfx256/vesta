import {Vesta} from "../file/Vesta";
import {IExtProjectConfig} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {PlatformConfig} from "../../PlatformConfig";
import {findInFileAndReplace} from "../../util/Util";
import {copy, mkdir} from "../../util/FsUtil";

export interface IClientAppConfig {
}

export class ClientAppGen {

    protected vesta: Vesta;

    constructor(protected config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance(config);
    }

    private cloneTemplate() {
        let dir = this.config.name,
            templateRepo = PlatformConfig.getRepository();
        GitGen.clone(this.vesta.isAdminPanel ? templateRepo.admin : templateRepo.client, dir);
    }

    public generate() {
        this.cloneTemplate();
        let dir = this.config.name,
            templateRepo = PlatformConfig.getRepository(),
            templateProjectName = GitGen.getRepoName(this.vesta.isAdminPanel ? templateRepo.admin : templateRepo.client),
            replacePattern = {};
        replacePattern[templateProjectName] = dir;
        copy(`${dir}/resources/gitignore/config.var.ts`, `${dir}/src/client/app/config/config.var.ts`);
        findInFileAndReplace(`${dir}/src/client/app/config/config.ts`, replacePattern);
        mkdir(`${dir}/vesta/client/cordova/www`); // for installing plugins this folder must exist
        findInFileAndReplace(`${dir}/vesta/client/cordova/config.xml`, replacePattern);
    }

    public static getGeneratorConfig(): Promise<IClientAppConfig> {
        return Promise.resolve(<IClientAppConfig>{});
    }
}
