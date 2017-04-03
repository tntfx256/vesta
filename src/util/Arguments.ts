export class Arguments {
    private varArgs = [];
    private parsedArgs = [];

    constructor(args: Array<string>) {
        this.parse(args);
    }

    private parse(args: Array<string>) {
        this.parsedArgs = [];
        for (let i = 0, il = args.length; i < il; ++i) {
            let thisArg = args[i].split(/\s*=\s*/);
            if (thisArg.length > 1) {
                for (let j = 0, jl = thisArg.length; j < jl; ++j) {
                    if (thisArg[j]) {
                        this.parsedArgs.push(thisArg[j]);
                    }
                }
            } else {
                this.parsedArgs.push(thisArg[0]);
            }
        }
        this.varArgs = this.parsedArgs;
    }

    public has(name: string): boolean {
        return this.parsedArgs.indexOf(name) >= 0;
    }

    public get(name?: string, defaultValue?: string): string {
        if (!name) {
            for (let i = 0, il = this.varArgs.length; i < il; ++i) {
                if (/^\-\-?[a-z]+/i.exec(this.varArgs[i])) {
                    ++i;
                } else {
                    defaultValue = this.varArgs[i];
                    this.varArgs.splice(i, 1);
                    break;
                }
            }
            return defaultValue;
        }
        let index = this.parsedArgs.indexOf(name);
        if (index >= 0) {
            defaultValue = this.parsedArgs[index + 1];
        }
        return defaultValue;
    }
}