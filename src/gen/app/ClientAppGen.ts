import {Vesta} from "../file/Vesta";
import {IProjectConfig} from "../ProjectGen";
import {Util} from "../../util/Util";
import {GitGen} from "../file/GitGen";
import {FsUtil} from "../../util/FsUtil";
import {PlatformConfig} from "../../PlatformConfig";

export interface IClientAppConfig {
}

export class ClientAppGen {

    protected vesta: Vesta;

    constructor(protected config: IProjectConfig) {
        this.vesta = Vesta.getInstance(config);
    }

    private cloneTemplate() {
        let dir = this.config.name,
            templateRepo = PlatformConfig.getRepository();
        GitGen.clone(this.vesta.isControlPanel ? templateRepo.cpanel : templateRepo.client, dir);
        GitGen.cleanClonedRepo(dir);
    }

    public generate() {
        this.cloneTemplate();
        let dir = this.config.name,
            templateRepo = PlatformConfig.getRepository(),
            templateProjectName = GitGen.getRepoName(this.vesta.isControlPanel ? templateRepo.cpanel : templateRepo.client),
            replacePattern = {};
        replacePattern[templateProjectName] = dir;
        FsUtil.copy(`${dir}/resources/gitignore/setting.var.ts`, `${dir}/src/client/app/config/setting.var.ts`);
        Util.findInFileAndReplace(`${dir}/src/client/app/config/setting.ts`, replacePattern);
        FsUtil.mkdir(`${dir}/vesta/client/cordova/www`); // for installing plugins this folder must exist
        Util.findInFileAndReplace(`${dir}/vesta/client/cordova/config.xml`, replacePattern);
    }

    public static getGeneratorConfig(): Promise<IClientAppConfig> {
        return Promise.resolve(<IClientAppConfig>{});
    }
}
