import * as shell from "shelljs";
import {ExecOptions, ExecOutputReturnValue} from "shelljs";
import {Log} from "./Log";
import {StringUtil} from "./StringUtil";

export interface IExecSyncResult extends ExecOutputReturnValue {

}

export interface IExecOptions extends ExecOptions {
    cwd?: string;
    stdio?: any;
    customFds?: any;
    env?: any;
    encoding?: string;
    timeout?: number;
    maxBuffer?: number;
    killSignal?: string;
}

export class CmdUtil {

    static execSync(command, options?: IExecOptions): IExecSyncResult {
        options = options || {};
        if (!options.silent) {
            Log.info(`${options.cwd || '.'}/> ${command} `);
        }
        return <ExecOutputReturnValue>shell.exec(command, options);
    }

    static getOutputOf(command, options?: IExecOptions): string {
        options = options || {silent: true};
        return StringUtil.trimLineBreaks(CmdUtil.execSync(command, options).output);
    }

    static getResult(command: string, options?: IExecOptions): Promise<string> {
        options = options || {silent: true};
        return new Promise<string>((resolve, reject)=> {
            shell.exec(command, options, (code: number, output: string)=> {
                resolve(output);
            })
        })
    }

    static table(header: Array<string>, rows: Array<Array<string>>) {
        // calculating max char of each column
        let maxChars: Array<number> = [];
        for (let i = 0, il = header.length; i < il; ++i) {
            maxChars[i] = header[i].length;
        }
        for (let i = 0, il = rows.length; i < il; ++i) {
            for (let j = 0, jl = rows[i].length; j < jl; ++j) {
                if (maxChars[j] < rows[i][j].length) {
                    maxChars[j] = rows[i][j].length;
                }
            }
        }
        // printing table
        let table = '';
        for (let i = 0, il = header.length; i < il; ++i) {
            table += StringUtil.fix(header[i], maxChars[i] + 2);
        }
        table += '\n';
        // line
        for (let i = table.length; i--;) {
            table += '-';
        }
        table += '\n';
        for (let i = 0, il = rows.length; i < il; ++i) {
            for (let j = 0, jl = rows[i].length; j < jl; ++j) {
                table += StringUtil.fix(rows[i][j], maxChars[j] + 2);
            }
            table += '\n';
        }
        console.log(table);
    }
}