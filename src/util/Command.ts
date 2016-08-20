export enum CommandOptionType {None, String, Boolean, Enum}

export class CommandOption {
    public shortcut: string;
    public desc: string;
    public values: Array<string> = [];
    public type: CommandOptionType = CommandOptionType.None;

    constructor(public name: string) {
    }

    public setType(type: CommandOptionType) {
        this.type = type;
        return this;
    }

    public setDescription(desc: string) {
        this.desc = desc;
        return this;
    }

    public setShortcut(shortcut) {
        this.shortcut = shortcut;
        return this;
    }

    public setValues(...values: Array<string>) {
        this.values = values;
        return this;
    }
}

export class Command {
    public description: string;
    public options: Array<CommandOption> = [];

    constructor(private name: string) {
    }

    public addOption(name: string): CommandOption {
        let option = new CommandOption(name);
        this.options.push(option);
        return option;
    }

    public getOption(name: string): CommandOption {
        for (let i = this.options.length; i--;) {
            let option = this.options[i];
            if (option.name == name) return option;
        }
        return null;
    }


    public description(desc: string): Command {
        this.description = desc;
        return this;
    }

    static parse(args: Array<string>) {
        console.log(args);
    }

}