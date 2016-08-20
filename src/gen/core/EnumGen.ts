import * as _ from "lodash";

export interface IEnumProperty {
    name: string;
    index: number;
}

export class EnumGen {

    public name: string;
    private startIndex: number = 1;
    protected shouldBeExported: boolean = true;
    private properties: Array<IEnumProperty> = [];

    constructor(name: string) {
        this.name = _.capitalize(_.camelCase(name));
    }

    public shouldExport(shouldBeExported: boolean = true) {
        this.shouldBeExported = shouldBeExported;
    }

    public addProperty(name: string, index?: number) {
        name = _.capitalize(_.camelCase(name));
        if (!index || index < 0) index = 0;
        for (var i = this.properties.length; i--;) {
            if (this.properties[i].name == name) {
                if (index) {
                    this.properties[i].index = index;
                }
                return;
            }
        }
        this.properties.push({name: name, index: index});
        this.properties = this.properties.sort((a: IEnumProperty, b: IEnumProperty)=> {
            return a.index - b.index;
        });
    }

    public setStartIndex(index: number) {
        for (var i = this.properties.length; i--;) {
            if (this.properties[i].index == index) {
                return;
            }
        }
        if (index >= 0) {
            this.startIndex = index;
        }
    }

    public generate(): string {
        var code = this.shouldBeExported ? 'export ' : '',
            props: Array<string> = [];

        code += `enum ${this.name} {`;
        for (var i = 0, il = this.properties.length; i < il; ++i) {
            if (this.properties[i].index) {
                props.push(`${this.properties[i].name} = ${this.properties[i].index}`);
            } else if (i == 0 && this.startIndex > 0) {
                props.push(`${this.properties[i].name} = ${this.startIndex}`);
            } else {
                props.push(this.properties[i].name);
            }
        }
        code = `${code}${props.join(', ')}}`;
        return code;
    }
}
