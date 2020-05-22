import * as minimist from "minimist";
import { ParsedArgs } from "minimist";

export class ArgParser {
  private static instance: ArgParser;

  public static getInstance() {
    if (!ArgParser.instance) {
      ArgParser.instance = new ArgParser(process.argv.slice(2));
    }
    return ArgParser.instance;
  }

  private parsedArgs: ParsedArgs;

  constructor(args: string[]) {
    this.parsedArgs = minimist(args);
  }

  public has(name: string): boolean {
    return !!this.parsedArgs[name];
  }

  public get(name?: string, defaultValue?: string, possibleValues?: string[]): string {
    const value = (name ? this.parsedArgs[name] : this.parsedArgs._.shift()) || defaultValue;
    if (!possibleValues) {
      return value;
    }
    for (let i = possibleValues.length; i--; ) {
      if (possibleValues[i] == value) {
        return value;
      }
    }
    return defaultValue;
  }

  public hasHelp() {
    return this.parsedArgs.h || this.parsedArgs.help;
  }
}
