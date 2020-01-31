import { DateTime } from "@vesta/culture";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { prompt as iPrompt, Question } from "inquirer";
import { camelCase, kebabCase } from "lodash";
import { getOutputOf } from "./CmdUtil";
import { readJsonFile, remove } from "./FsUtil";
import { Log } from "./Log";
import { pascalCase } from "./StringUtil";

export function ask<T>(questions: Question | Question[]): Promise<T> {
  return new Promise<T>(resolve => {
    iPrompt(questions).then(answer => {
      resolve((answer as any) as T);
    });
  });
}

export function findInFileAndReplace(filePath: string, patternReplacePair: any) {
  if (!existsSync(filePath)) {
    return Log.error(`File not found: ${filePath}`);
  }
  let code = readFileSync(filePath, "utf8");
  for (let patterns = Object.keys(patternReplacePair), i = patterns.length; i--; ) {
    const pattern = patterns[i];
    const replace = patternReplacePair[pattern];
    const allPatterns = [pattern, pascalCase(pattern), kebabCase(pattern), camelCase(pattern)];
    const allReplaces = [replace, pascalCase(replace), kebabCase(replace), camelCase(replace)];
    for (let j = 0, jl = allPatterns.length; j < jl; ++j) {
      const regex = new RegExp(allPatterns[j], "g");
      code = code.replace(regex, allReplaces[j]);
    }
  }
  writeFileSync(filePath, code);
}

export function appendToFile(filePath: string, content: string) {
  if (existsSync(filePath)) {
    let code = readFileSync(filePath, "utf8");
    if (code.indexOf(content) === -1) {
      code = `${code}\n${content}`;
      writeFileSync(filePath, code);
    }
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
      ["repository", "author", "description", "contributors", "bugs"].forEach((key: string) => delete packageContent[key]);
      writeFileSync(packageFile, JSON.stringify(packageContent, null, 2));
    }
  } else {
    // this is the cmn project
    remove(packageFile);
  }
  [".git", "CHANGELOG.md", "LICENSE", "README.md"].forEach((file: string) => remove(`${root}/${file}`));
}

export function getDateTime(format: string, timestamp?: number) {
  const d = new Date();
  if (timestamp) {
    d.setTime(timestamp);
  }
  DateTime.prototype.format.call(d, format);
}

export function getOsCodeName(): string {
  return getOutputOf(`lsb_release -cs`).trim();
}

export function getKernelVersion() {
  return getOutputOf(`uname -r`).trim();
}

export function debug(...data) {
  // tslint:disable-next-line:no-console
  console.log("\n\t\tSTART\n");
  // tslint:disable-next-line:no-console
  console.log(...data);
  // tslint:disable-next-line:no-console
  console.log("\n\t\tEND\n");
  process.exit();
}
