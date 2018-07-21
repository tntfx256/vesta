import { join } from "path";
import { ArgParser } from "../../../util/ArgParser";
import { mkdir, writeFile } from "../../../util/FsUtil";
import { Log } from "../../../util/Log";
import { camelCase } from "../../../util/StringUtil";
import { findInFileAndReplace } from "../../../util/Util";
import { Placeholder } from "../../core/Placeholder";

export interface ISassGenConfig {
    name: string;
    type: string;
}

export class SassGen {

    public static Type = { Font: "font" };

    public static help() {
        Log.write(`
Usage: vesta gen sass <NAME> [options...]

Creating a sass file of specific type (font)

Options:
    --type      Generates a sass file for specific type {default: font}
    --force     Overwrite file content if already exists {default: false}
`);
    }

    public static init(): ISassGenConfig {
        const argParser = ArgParser.getInstance();
        const config: ISassGenConfig = {
            name: argParser.get(),
            type: argParser.get("--type"),
        };
        if (!name || !/^[a-z-0-9]+/i.exec(config.name)) {
            Log.error("Missing/Invalid sass file name\nSee 'vesta gen sass --help' for more information\n");
            return;
        }
        const sass = new SassGen(config);
        sass.generate();
    }

    private basePath = "src/scss";

    constructor(private config: ISassGenConfig) {
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

    private genFontSass() {
        const code = `@font-face {
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
        const dir = join(this.basePath, "fonts");
        const pattern = {};
        mkdir(dir);
        writeFile(join(dir, `_${this.config.name}.scss`), code);
        const importStatement = `@import 'fonts/${this.config.name}';`;
        pattern[Placeholder.SassFont] = `${importStatement}\n${Placeholder.SassFont}`;
        findInFileAndReplace(join(this.basePath, "_common.scss"), pattern, (content) => content.indexOf(importStatement) < 0);
    }
}
