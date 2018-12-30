import { existsSync, writeFileSync } from "fs";
import { kebabCase } from "lodash";
import { genRelativePath } from "../../util/FsUtil";
import { appendToFile } from "../../util/Util";
import { Vesta } from "../Vesta";

export function genSass(name: string, path: string) {

    writeFileSync(`${path}/${name}.scss`, `.${kebabCase(name)}{}\n`);

    const scssDir = Vesta.directories.sass;
    if (existsSync(`${scssDir}/_common.scss`)) {
        const relPath = genRelativePath(path, scssDir);
        const importStatement = `@import '${relPath}/${name}';`;
        appendToFile(`${scssDir}/_common.scss`, importStatement);
    }

    function getFontSnippet() {
        return `@font-face {
    font-family: '${name}';
    src: url('#{$font-path}/${name}.eot?#iefix') format('embedded-opentype'),
    url('#{$font-path}/${name}.woff') format('woff'),
    url('#{$font-path}/${name}.ttf') format('truetype'),
    url('#{$font-path}/${name}.svg#${name}') format('svg');
    font-weight: normal;
    font-style: normal;
  }
`;
    }
}
