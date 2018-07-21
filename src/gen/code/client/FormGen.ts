import { existsSync } from "fs";
import { ArgParser } from "../../../util/ArgParser";
import { mkdir } from "../../../util/FsUtil";
import { Log } from "../../../util/Log";
import { camelCase, fcUpper } from "../../../util/StringUtil";
import { Vesta } from "../../file/Vesta";
import { ICrudComponentGenConfig, IModelConfig } from "./ComponentGen";
import { FormComponentGen } from "./crud/FormComponentGen";

export interface IFormGenConfig extends ICrudComponentGenConfig {
    independent?: boolean;
}

export class FormGen {

    public static help() {
        Log.write(`
Usage: vesta gen form <NAME> [options...]

Creating React component

    NAME        The name of the component

Options:
    --model     Create form based on this model [required]
    --path      Where to save component [default: src/client/component/root]
    --no-style  Do not generate scss style file

Example:
    vesta gen form test --model=User
`);
    }

    public static init() {
        const argParser = ArgParser.getInstance();
        const config: IFormGenConfig = {
            hasStyle: !argParser.has("--no-style"),
            independent: true,
            isPage: argParser.has("--is-page"),
            model: argParser.get("--model"),
            name: argParser.get(),
            noParams: false,
            path: argParser.get("--path", "root"),
            stateless: false,
        } as IFormGenConfig;
        if (!config.name) {
            Log.error("Missing/Invalid component name\nSee 'vesta gen form --help' for more information\n");
            return;
        }
        if (!config.model) {
            Log.error("Missaing/Invalid model\nSee 'vesta gen form --help' for more information\n");
            return;
        }
        (new FormGen(config)).generate();
    }

    private className: string;
    private path = "src/client/app/components/";

    constructor(private config: IFormGenConfig) {
        if (Vesta.getInstance().isNewV2()) {
            this.path = "src/app/components/";
        }
        this.path += config.path;
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    public generate() {
        this.config.modelConfig = this.parseModel();
        const fg = new FormComponentGen(this.config);
    }

    private parseModel(): IModelConfig {
        const modelFilePath = `src/client/app/cmn/models/${this.config.model}.ts`;
        if (!existsSync(modelFilePath)) {
            Log.error(`Specified model was not found: '${modelFilePath}'`);
            return null;
        }
        // todo: require model file

        const modelClassName = fcUpper(this.config.model.match(/([^\/]+)$/)[1]);
        return {
            className: modelClassName === this.className ? `${modelClassName}Model` : modelClassName,
            file: modelFilePath,
            instanceName: camelCase(modelClassName),
            interfaceName: `I${modelClassName}`,
            originalClassName: modelClassName,
        };
    }
}
