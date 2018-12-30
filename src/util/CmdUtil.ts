import { execSync, ExecSyncOptions } from "child_process";
import { Log } from "./Log";
import { fix, trimLineBreaks } from "./StringUtil";

export interface IExecOptions extends ExecSyncOptions {
    silent?: boolean;
    interactive?: boolean;
}

export interface IExecReasult {
    error: Error;
    stdout: string;
    stderr: string;
}

/*export function exec(command, options?: IExecOptions): Promise<IExecReasult> {
 return new Promise<IExecReasult>((resolve) => {
 exec(command, options, (error: Error, stdout: string, stderr: string) => {
 resolve({error, stdout, stderr});
 })
 });
 }*/

export function execute(command, options?: IExecOptions): string {
    options = options || {};
    if (options.hasOwnProperty("interactive")) {
        options.interactive = true;
        delete options.interactive;
    }
    if (!options.silent) {
        Log.info(`${options.cwd || "."}/> ${command} `);
        delete options.silent;
    }
    options.stdio = ["inherit", options.interactive ? "inherit" : "pipe", "inherit"];
    // options.encoding = 'utf8';
    return execSync(command, options).toString("utf8");
}

export function getOutputOf(command, options?: IExecOptions): string {
    options = options || { silent: true, interactive: false };
    return trimLineBreaks(execute(command, options));
}

export function table(header: string[], rows: string[][]) {
    // calculating max char of each column
    const maxChars: number[] = [];
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
    let html = "";
    for (let i = 0, il = header.length; i < il; ++i) {
        html += fix(header[i], maxChars[i] + 2);
    }
    html += "\n";
    // line
    for (let i = html.length; i--;) {
        html += "-";
    }
    html += "\n";
    for (let i = 0, il = rows.length; i < il; ++i) {
        for (let j = 0, jl = rows[i].length; j < jl; ++j) {
            html += fix(rows[i][j], maxChars[j] + 2);
        }
        html += "\n";
    }
    // tslint:disable-next-line:no-console
    console.log(html);
}
