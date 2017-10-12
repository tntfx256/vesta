import {ArgParser} from "../../../util/ArgParser";
import {Log} from "../../../util/Log";
import {camelCase, fcUpper} from "../../../util/StringUtil";
import {mkdir} from "../../../util/FsUtil";
import {IModelFields} from "@vesta/core";
import {CrudComponentGenConfig, ModelConfig} from "./ComponentGen";
import {existsSync} from "fs";
import {FormComponentGen} from "./crud/FormComponentGen";

export interface FormGenConfig extends CrudComponentGenConfig {
    independent?: boolean;
}


export class FormGen {
    private className: string;
    private model: ModelConfig;
    private path = 'src/client/app/components/';
    private relationalFields: IModelFields;

    constructor(private config: FormGenConfig) {
        this.path += config.path;
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    private parseModel(): ModelConfig {
        let modelFilePath = `src/client/app/cmn/models/${this.config.model}.ts`;
        if (!existsSync(modelFilePath)) {
            Log.error(`Specified model was not found: '${modelFilePath}'`);
            return null;
        }
        // todo: require model file

        let modelClassName = fcUpper(this.config.model.match(/([^\/]+)$/)[1]);
        return {
            file: modelFilePath,
            originalClassName: modelClassName,
            className: modelClassName == this.className ? `${modelClassName}Model` : modelClassName,
            interfaceName: `I${modelClassName}`,
            instanceName: camelCase(modelClassName)
        };
    }

    public generate() {
        this.config.modelConfig= this.parseModel();
        let fg = new FormComponentGen(this.config);
    }

    static init() {
        const argParser = ArgParser.getInstance();
        let config: FormGenConfig = <FormGenConfig>{
            name: argParser.get(),
            path: argParser.get('--path', 'root'),
            model: argParser.get('--model'),
            hasStyle: !argParser.has('--no-style'),
            isPage: argParser.has('--is-page'),
            stateless: false,
            noParams: false,
            independent: true
        };
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

    static help() {
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
}