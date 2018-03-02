import { DateTime } from "@vesta/core/DateTime";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { prompt as iPrompt, Question } from "inquirer";
import { readJsonFile, remove } from "./FsUtil";
import { Log } from "./Log";

export function ask<T>(questions: Question | Array<Question>): Promise<T> {
    return new Promise<T>((resolve) => {
        iPrompt(questions).then((answer) => {
            resolve(answer as any as T);
        });
    });
}

export function findInFileAndReplace(filePath: string, patternReplacePair: any, shoulProceed?: (content: string) => boolean) {
    if (existsSync(filePath)) {
        let code = readFileSync(filePath, "utf8");
        const tobeContinue = shoulProceed ? shoulProceed(code) : true;
        for (let patterns = Object.keys(patternReplacePair), i = patterns.length; i--;) {
            const pattern = patterns[i];
            const replace = patternReplacePair[pattern];
            const regex = new RegExp(pattern, "g");
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

export function clone<T>(object: T) {
    return JSON.parse(JSON.stringify(object)) as T;
}

export function finalizeClonedTemplate(root: string, newName: string = "") {
    const packageFile = `${root}/package.json`;
    if (newName) {
        if (existsSync(packageFile)) {
            const packageContent = readJsonFile<any>(packageFile);
            packageContent.private = true;
            packageContent.license = "UNLICENSED";
            packageContent.version = "0.1.0";
            packageContent.name = newName;
            ["repository", "author", "description", "contributors", "bugs"].forEach((key) => delete packageContent[key]);
            writeFileSync(packageFile, JSON.stringify(packageContent, null, 2));
        }
    } else {
        remove(packageFile);
    }
    [".git", "CHANGELOG.md", "LICENSE", "README.md"].forEach((file) => remove(`${root}/${file}`));
}

export function getDateTime(format: string, timestamp?: number) {
    const d = new Date();
    if (timestamp) {
        d.setTime(timestamp);
    }
    DateTime.prototype.format.call(d, format);
}
