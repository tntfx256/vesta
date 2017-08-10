import {existsSync, readFileSync, writeFileSync} from "fs";
import {prompt as iPrompt, Question} from "inquirer";
import {Log} from "./Log";
import {remove} from "./FsUtil";

export function ask<T>(questions: Question | Array<Question>): Promise<T> {
    return new Promise<T>(resolve => {
        iPrompt(questions).then(answer => {
            resolve(answer as any as T);
        })
    })
}

export function findInFileAndReplace(filePath: string, patternReplacePair: any, shoulProceed?: (content: string) => boolean) {
    if (existsSync(filePath)) {
        let code = readFileSync(filePath, 'utf8');
        let tobeContinue = shoulProceed ? shoulProceed(code) : true;
        for (let patterns = Object.keys(patternReplacePair), i = patterns.length; i--;) {
            let pattern = patterns[i];
            let replace = patternReplacePair[pattern];
            let regex = new RegExp(pattern, 'g');
            if (!tobeContinue) {
                continue;
            }
            code = code.replace(regex, replace);
        }
        writeFileSync(filePath, code);
        return;
    }
    Log.error(`File not found @${filePath}`);
}

export function fileHasContent(filePath: string, pattern: string): boolean {
    if (existsSync(filePath)) {
        let code = readFileSync(filePath, 'utf8');
        return code.indexOf(pattern) >= 0;
    }
    return false;
}

export function clone<T>(object: T) {
    return <T>JSON.parse(JSON.stringify(object));
}

export function finalizeClonedTemplate(root: string, newName: string = '') {
    let packageFile = `${root}/package.json`;
    if (newName) {
        if (existsSync(packageFile)) {
            let json: any = JSON.parse(readFileSync(packageFile, 'utf8'));
            json.private = true;
            json.license = 'UNLICENSED';
            json.version = '0.1.0';
            json.name = newName;
            ['repository', 'author', 'description', 'contributors', 'bugs'].forEach(key => delete json[key]);
            writeFileSync(packageFile, JSON.stringify(json, null, 2));
        }
    } else {
        remove(packageFile);
    }
    ['.git', 'CHANGELOG.md', 'LICENSE', 'README.md'].forEach(file => remove(`${root}/${file}`));
}
