import {existsSync, readFileSync, writeFileSync} from "fs";
import {prompt as iPrompt, Question} from "inquirer";
import {Log} from "./Log";
import {remove} from "./FsUtil";

export function ask<T>(questions: Question | Array<Question>): Promise<T> {
    return new Promise<T>(resolve => {
        console.log(questions);
        iPrompt(questions).then(answer => {
            console.log(answer);
            resolve(answer as any as T);
        })
    })
}

export function findInFileAndReplace(filePath: string, patternReplacePair: any, preventIfExists: boolean = false) {
    if (existsSync(filePath)) {
        let code = readFileSync(filePath, 'utf8');
        for (let pattern in patternReplacePair) {
            if (patternReplacePair.hasOwnProperty(pattern)) {
                if (preventIfExists && code.indexOf(patternReplacePair[pattern]) >= 0) {
                    continue;
                }
                let regex = new RegExp(pattern, 'g');
                code = code.replace(regex, patternReplacePair[pattern]);
            }
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
    if (name) {
        if (existsSync(packageFile)) {
            let json: any = JSON.parse(readFileSync(root, 'utf8'));
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
