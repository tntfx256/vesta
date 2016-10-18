import * as path from "path";
import * as fse from "fs-extra";
import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {Log} from "./Log";

export class Util {

    static prompt<T>(questions: Question|Array<Question>): Promise<T> {
        return new Promise<T>(resolve=> {
            inquirer.prompt(questions)['then'](answer=> {
                resolve(answer as any as T);
            });
        })
    }

    static plural(name: string): string {
        var lastChar = name.charAt(name.length - 1).toLocaleLowerCase();
        if (['a', 'i', 'u', 's'].indexOf(lastChar) >= 0) {
            return name + 'es';
        }
        if (['y'].indexOf(name.charAt(name.length - 1)) >= 0) {
            return name.substr(0, name.length - 1) + 'ies';
        }
        return name + 's';
    }

    static toJSON(object: any, prune: boolean = false) {
        var json = {};
        for (var key in object) {
            var value = object[key];
            if (object.hasOwnProperty(key) && 'function' != typeof value) {
                if (prune) {
                    var type = typeof object[key];
                    if (type == 'object') {
                        if (object['splice']) {// array
                            if (value.length) json[key] = value;
                        } else { // object
                            if (Object.keys(value).length) json[key] = value;
                        }
                    } else if (type == 'string') { // string
                        if (value) json[key] = value;
                    } else {
                        json[key] = value;
                    }
                } else {
                    json[key] = value;
                }
            }
        }
        return json;
    }

    static genRelativePath(from: string, to: string): string {
        var relPath = path.relative(from, to).replace(/\\/g, '/').replace(/\.ts$/, '');
        if (relPath.charAt(0) != '.') {
            relPath = './' + relPath;
        }
        return relPath;
    }

    static joinPath(...paths: Array<string>): string {
        return path.join(...paths).replace(/\\/g, '/');
    }

    static findInFileAndReplace(filePath: string, patternReplacePair: any, preventIfExists: boolean = false) {
        if (fse.existsSync(filePath)) {
            var code = fse.readFileSync(filePath, {encoding: 'utf8'});
            for (var pattern in patternReplacePair) {
                if (patternReplacePair.hasOwnProperty(pattern)) {
                    if (preventIfExists && code.indexOf(patternReplacePair[pattern]) >= 0) {
                        continue;
                    }
                    var regex = new RegExp(pattern, 'g');
                    code = code.replace(regex, patternReplacePair[pattern]);
                }
            }
            fse.writeFileSync(filePath, code);
            return;
        }
        Log.error(`File not found @${filePath}`);
    }

    static fileHasContent(filePath: string, pattern: string): boolean {
        if (fse.existsSync(filePath)) {
            var code = fse.readFileSync(filePath, {encoding: 'utf8'});
            return code.indexOf(pattern) >= 0;
        }
        return false;
    }

    static clone<T>(object: T) {
        return <T>JSON.parse(JSON.stringify(object));
    }

    static getArgs(args: Array<string>) {

    }

    static getArgValue(args: Array<string>, argName: string, defaultValue: any = null): string {
        let index = args.indexOf(argName);
        if (index >= 0) {
            defaultValue = args[index + 1];
        }
        return defaultValue;
    }

    static hasArg(args: Array<string>, argName: string): boolean {
        return args.indexOf(argName) >= 0;
    }
}
