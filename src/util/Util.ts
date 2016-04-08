import * as colors from "colors";
import * as path from "path";
import * as fse from "fs-extra";
import * as shell from "shelljs";
import {ExecOptions} from "shelljs";
import {Question} from "inquirer";
import inquirer = require("inquirer");

export interface IExecOption {
    cwd?:string;
    stdio?:any;
    customFds?:any;
    env?:any;
    encoding?:string;
    timeout?:number;
    maxBuffer?:number;
    killSignal?:string;
}

export class Util {
    public static Mode = {
        Development: 1,
        Production: 2
    };
    private static config = {
        mode: Util.Mode.Development
    };

    public static setMode(mode:number) {
        Util.config.mode = mode;
    }

    static log = {
        simple: (message:string)=> {
            console.log(message);
        },
        info: (message:string)=> {
            Util.log.color('cyan', message);
        },
        error: (message:string)=> {
            Util.log.color('red', message);
        },
        warning: (message:string)=> {
            Util.log.color('yellow', message);
        },
        success: (message:string)=> {
            Util.log.color('green', message);
        },
        color: (color:string, message:string)=> {
            console.log(colors[color](message));
        }
    };

    static fs = {
        mkdir(...dirs:Array<string>): void {
            dirs.forEach(dir=> {
                try {
                    fse.mkdirpSync(dir);
                } catch (e) {
                    Util.log.error(`mkdir: ${e.message}`);
                }
            })
        },
        writeFile(path:string, content:string){
            try {
                fse.writeFileSync(path, content);
            } catch (e) {
                Util.log.error(`writeFile: ${e.message}`);
            }
        },
        copy(src:string, dest:string){
            try {
                fse.copySync(src, dest);
            } catch (e) {
                Util.log.error(`copy: ${e.message}`);
            }
        },
        rename(src:string, dest:string){
            try {
                fse.renameSync(src, dest);
            } catch (e) {
                Util.log.error(`rename: ${e.message}`);
            }
        },
        remove(path:string){
            try {
                fse.removeSync(path);
            } catch (e) {
                Util.log.error(`remove: ${e.message}`);
            }
        }
    };

    static prompt(questions:Question|Array<Question>):Promise<any> {
        return new Promise<any>(resolve=> {
            inquirer.prompt(questions, answer=>resolve(answer));
        })
    }

    static plural(name:string):string {
        var lastChar = name.charAt(name.length - 1).toLocaleLowerCase();
        if (['a', 'i', 'u'].indexOf(lastChar) >= 0) {
            return name + 'es';
        }
        if (['y'].indexOf(name.charAt(name.length - 1)) >= 0) {
            return name.substr(0, name.length - 1) + 'ies';
        }
        return name + 's';
    }

    static toJSON(object:any, prune:boolean = false) {
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

    static genRelativePath(from:string, to:string):string {
        var relPath = path.relative(from, to).replace(/\\/g, '/').replace(/\.ts$/, '');
        if (relPath.charAt(0) != '.') {
            relPath = './' + relPath;
        }
        return relPath;
    }

    static joinPath(...paths:Array<string>):string {
        return path.join(...paths).replace(/\\/g, '/');
    }

    static findInFileAndReplace(filePath:string, patternReplacePair:any, preventIfExists:boolean = false) {
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
        Util.log.error(`File not found @${filePath}`);
    }

    static fileHasContent(filePath:string, pattern:string):boolean {
        if (fse.existsSync(filePath)) {
            var code = fse.readFileSync(filePath, {encoding: 'utf8'});
            return code.indexOf(pattern) >= 0;
        }
        return false;
    }

    static exec(command:string, wd:string = '.'):Promise<Buffer> {
        return new Promise(resolve=> {
            var commandArgs = command.trim().split(/\s+/),
                commandExec = commandArgs.shift()/*,
             cmd = childProcess.spawn(commandExec, commandArgs, {cwd: wd, env: process.env, detached: true})*/;
            if (Util.config.mode == Util.Mode.Development) {
                Util.log.info(`${wd}/> ${commandExec} ${commandArgs.join(' ')} `);
            }
            var result = shell.exec(command, <ExecOptions>{cwd: wd});
            // cmd.stdout.on('data', data=>Util.log.simple('' + data));
            // cmd.stderr.on('data', data=>Util.log.simple('' + data));
            // cmd.on('close', data=>resolve(data));
            resolve(result);
        })
    }

    static run(command, wd:string = '.', alwaysResolve:boolean = false):Promise<Buffer> {
        return new Promise((resolve, reject)=> {
            if (Util.config.mode == Util.Mode.Development) {
                Util.log.info(`${wd}/> ${command} `);
            }
            // childProcess.exec(command, {cwd: wd}, (err:Error, stdout:string, stderr:string)=> {
            //     if (err) return alwaysResolve ? resolve(stdout) : reject(err);
            //     resolve(stdout);
            // });
            var result = shell.exec(command, <ExecOptions>{cwd: wd}, (code, output)=> {
                resolve(result);
            });
        })
    }
}
