import * as path from "path";
import {Placeholder} from "../core/Placeholder";
import {Log} from "../../util/Log";
import {ArgParser} from "../../util/ArgParser";
import {camelCase} from "../../util/StringUtil";
import {mkdir, writeFile} from "../../util/FsUtil";
import {findInFileAndReplace} from "../../util/Util";

export interface SassGenConfig {
    name: string;
    type: string;
}

export class SassGen {
    static Type = {Font: 'font'};
    private basePath = 'src/scss';

    constructor(private config: SassGenConfig) {
    }

    private genFontSass() {
        let code = `@font-face {
  font-family: '${this.config.name}';
  src: url('#{$font-path}/${this.config.name}.eot?#iefix') format('embedded-opentype'),
  url('#{$font-path}/${this.config.name}.woff') format('woff'),
  url('#{$font-path}/${this.config.name}.ttf') format('truetype'),
  url('#{$font-path}/${this.config.name}.svg#${this.config.name}') format('svg');
  font-weight: normal;
  font-style: normal;
}
`;
        this.config.name = camelCase(this.config.name);
        let dir = path.join(this.basePath, 'fonts');
        let pattern = {};
        mkdir(dir);
        writeFile(path.join(dir, `_${this.config.name}.scss`), code);
        const importStatement = `@import 'fonts/${this.config.name}';`;
        pattern[Placeholder.SassFont] = `${importStatement}\n${Placeholder.SassFont}`;
        findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, code => code.indexOf(importStatement) < 0);
    }

    public generate() {
        switch (this.config.type) {
            case SassGen.Type.Font:
                this.genFontSass();
                break;
            default:
                Log.error(`Unsupported sass type ${this.config}`);
        }
    }

    public static init(): SassGenConfig {
        const argParser = ArgParser.getInstance();
        const config: SassGenConfig = {
            name: argParser.get(),
            type: argParser.get('--type')
        };
        if (!name || !/^[a-z-0-9]+/i.exec(config.name)) {
            Log.error("Missing/Invalid sass file name\nSee 'vesta gen sass --help' for more information\n");
            return;
        }
        let sass = new SassGen(config);
        sass.generate();
    }

    static help() {
        Log.write(`
Usage: vesta gen sass <NAME> [options...]

Creating a sass file of specific type (font)
    
Options:
    --type      Generates a sass file for specific type {default: font}
    --force     Overwrite file content if already exists {default: false} 
`);
    }
}