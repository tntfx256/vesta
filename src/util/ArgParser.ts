export class ArgParser {

    public static getInstance() {
        if (!ArgParser.instance) {
            const args = process.argv;
            args.shift();
            args.shift();
            ArgParser.instance = new ArgParser(args);
        }
        return ArgParser.instance;
    }

    private static instance: ArgParser;
    private originalValues = [];
    private parsedArgs = {};
    private values = [];

    constructor(args: Array<string>) {
        this.parse(args);
    }

    public has(...name: Array<string>): boolean {
        for (let i = name.length; i--;) {
            if (name[i] in this.parsedArgs) {
                return true;
            }
        }
        return false;
    }

    public get(name?: string, defaultValue?: string, possibleValues?: Array<string>): string {
        const value = (name ? this.parsedArgs[name] : this.values.shift()) || defaultValue;
        if (!possibleValues) { return value; }
        for (let i = possibleValues.length; i--;) {
            if (possibleValues[i] == value) { return value; }
        }
        return defaultValue;
    }

    public hasHelp() {
        return this.has("-h", "--help");
    }

    private parse(args: Array<string>) {
        for (let i = 0, il = args.length; i < il; ++i) {
            const thisArg = args[i].split("=");
            if (thisArg.length == 1) {
                if (thisArg[0].indexOf("-") == 0) {
                    if (args[i + 1] && args[i + 1].indexOf("=") == 0) {
                        // --option = value
                        this.parsedArgs[thisArg[0]] = args[i += 2];
                    } else {
                        // --switch
                        this.parsedArgs[thisArg[0].toLowerCase()] = true;
                    }
                } else {
                    // value
                    this.originalValues.push(thisArg[0]);
                }
            } else if (thisArg.length == 2) {
                if (thisArg[0] && thisArg[1]) {
                    // --option=value
                    this.parsedArgs[thisArg[0].toLowerCase()] = thisArg[1];
                } else if (thisArg[0] && !thisArg[1]) {
                    // --option= value
                    this.parsedArgs[thisArg[0].toLowerCase()] = args[++i];
                }
            }
        }
        this.values = this.originalValues;
    }
}