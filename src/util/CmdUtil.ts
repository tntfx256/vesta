import {exec, execSync, ExecSyncOptions} from "child_process";
import {Log} from "./Log";
import {StringUtil} from "./StringUtil";

export interface IExecOptions extends ExecSyncOptions {
    silent?: boolean;
    interactive?: boolean;
}

export interface IExecReasult {
    error: Error;
    stdout: string;
    stderr: string;
}

export class CmdUtil {

    static exec(command, options?: IExecOptions): Promise<IExecReasult> {
        return new Promise<IExecReasult>((resolve) => {
            exec(command, options, (error: Error, stdout: string, stderr: string) => {
                resolve({error, stdout, stderr});
            })
        });
    }

    static execSync(command, options?: IExecOptions): string {
        options = options || {};
        if (options.hasOwnProperty('interactive')) {
            options.interactive = true;
            delete options.interactive;
        }
        if (!options.silent) {
            Log.info(`${options.cwd || '.'}/> ${command} `);
            delete options.silent;
        }
        options.stdio = ['inherit', options.interactive ? 'inherit' : 'pipe', 'inherit'];
        // options.encoding = 'utf8';
        return execSync(command, options).toString('utf8');
    }

    static getOutputOf(command, options?: IExecOptions): string {
        options = options || {silent: true, interactive: false};
        return StringUtil.trimLineBreaks(CmdUtil.execSync(command, options));
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