import * as fs from "fs-extra";
import * as path from "path";
import {Placeholder} from "../core/Placeholder";
import {Log} from "../../util/Log";
import {ArgParser} from "../../util/ArgParser";
import {camelCase} from "../../util/StringUtil";
import {writeFile} from "../../util/FsUtil";
import {findInFileAndReplace} from "../../util/Util";

export interface SassGenConfig {
    name: string;
    type: string;
}

export class SassGen {
    static Type = {Font: 'font', Component: 'component', Page: 'page'};
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
        let dir = path.join(this.basePath, 'fonts'),
            pattern = {};
        try {
            fs.mkdirpSync(dir);
        } catch (e) {
        }
        writeFile(path.join(dir, `_${this.config.name}.scss`), code);
        pattern[Placeholder.SassFont] = `@import 'fonts/${this.config.name}';\n${Placeholder.SassFont}`;
        findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    }

    private genPageSass() {
        let code = `#${this.config.name}-page {
}
`;
        let dir = path.join(this.basePath, 'pages'),
            pattern = {};
        try {
            fs.mkdirpSync(dir);
        } catch (e) {
        }
        writeFile(path.join(dir, `_${this.config.name}.scss`), code);
        pattern[Placeholder.SassPage] = `@import 'pages/${this.config.name}';\n${Placeholder.SassPage}`;
        findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    }

    private genComponentSass() {
        let code = `.${this.config.name} {
}
`;
        let dir = path.join(this.basePath, 'components'),
            pattern = {};
        try {
            fs.mkdirpSync(dir);
        } catch (e) {
        }
        writeFile(path.join(dir, `_${this.config.name}.scss`), code);
        pattern[Placeholder.SassComponent] = `@import 'components/${this.config.name}';\n${Placeholder.SassComponent}`;
        findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    }

    private genDirectiveSass() {
        let code = `.${this.config.name} {
}
`;
        let dir = path.join(this.basePath, 'directives'),
            pattern = {};
        try {
            fs.mkdirpSync(dir);
        } catch (e) {
        }
        writeFile(path.join(dir, `_${this.config.name}.scss`), code);
        pattern[Placeholder.SassDirective] = `@import 'directives/${this.config.name}';\n${Placeholder.SassDirective}`;
        findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    }

    public generate() {
        switch (this.config.type) {
            case SassGen.Type.Font:
                this.genFontSass();
                break;
            case SassGen.Type.Component:
                this.genComponentSass();
                break;
            case SassGen.Type.Page:
                this.genPageSass();
                break;
        }
    }

    public static init(arg: ArgParser): SassGenConfig {
        const config: SassGenConfig = {
            name: arg.get(),
            type: arg.get('--type', SassGen.Type.Page)
        };
        if (!name || !/^[a-z-0-9]+/i.exec(config.name)) {
            Log.error("Missing/Invalid sass file name\nSee 'vesta gen sass --help' for more information");
            return;
        }
        let sass = new SassGen(config);
        sass.generate();
    }

    static help() {
        Log.write(`
Usage: vesta gen sass <NAME> [options...]

Creating a sass file of specific type (component, page, font)
    
Options:
    --type      Generates a sass file for specific type {default: page}
    --force     Overwrite file content if already exists {default: false} 
`);
    }
}