import { execSync, ExecSyncOptions, ExecSyncOptionsWithStringEncoding } from "child_process";
import { Log } from "./Log";
import { fix, trimLineBreaks } from "./StringUtil";
import { bold } from "colors";

export interface IExecOptions extends ExecSyncOptions {
  showCommand?: boolean;
  silent?: boolean;
}

export interface IExecReasult {
  error: Error;
  stdout: string;
  stderr: string;
}

export function execute(command, options?: IExecOptions): string {
  options = options || {};
  const { showCommand = true, silent = false, ...execOptions } = options || {};

  if (showCommand) {
    Log.info(`${execOptions.cwd || ""}> ${command} \n`);
  }

  execOptions.encoding = "utf8";
  execOptions.stdio = silent ? "pipe" : "inherit";

  return execSync(command, execOptions as ExecSyncOptionsWithStringEncoding);
}

export function execWithoutOutput(command: string): string {
  return execute(command, { showCommand: false, silent: true });
}

export function getOutputOf(command): string {
  return trimLineBreaks(execWithoutOutput(command));
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
  for (let i = html.length; i--; ) {
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
