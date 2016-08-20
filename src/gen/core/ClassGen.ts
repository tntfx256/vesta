import {IMixin} from "./TSFileGen";
import {AbstractStructureGen} from "./AbstractStructureGen";
import {MethodGen} from "./MethodGen";

export class ClassGen extends AbstractStructureGen {
    static Access = {
        Public: 'public',
        Private: 'private',
        Protected: 'protected'
    };
    private mixins: Array<IMixin> = [];

    constructor(public name: string, public isAbstract: boolean = false) {
        super(name);
    }

    public addMethod(name: string, access: string = ClassGen.Access.Public, isStatic: boolean = false, isAbstract: boolean = false): MethodGen {
        var method = super.addMethod(name);
        method.setAccessType(access);
        method.setAsStatic(isStatic);
        method.setAsAbstract(isAbstract);
        return method;
    }

    public addMixin(name: string, code: string) {
        this.mixins.push({name: name, code: code});
    }

    public setAsAbstract(isAbstract: boolean = true) {
        this.isAbstract = isAbstract;
    }

    private getPropertiesCode(): string {
        var codes = [];
        for (var i = 0, il = this.properties.length; i < il; ++i) {
            var code = (this.properties[i].access ? this.properties[i].access : 'public') + ' ';
            if (this.properties[i].isStatic) code += 'static ';
            code += this.properties[i].name;
            if (this.properties[i].isOptional) code += '?';
            if (this.properties[i].type) code += `:${this.properties[i].type}`;
            if (this.properties[i].defaultValue) code += ` = ${this.properties[i].defaultValue}`;
            code += ';';
            codes.push(code);
        }
        return codes.join('\n    ');
    }

    public generate(): string {
        var exp = this.shouldBeExported ? 'export ' : '',
            abs = this.isAbstract ? ' abstract ' : '';
        var code = `\n${exp}${abs}class ${this.name}`;
        if (this.parentClass) code += ' extends ' + this.parentClass;
        if (this.implementations.length) {
            code += ' implements ' + this.implementations.join(', ');
        }
        code += ' {\n';
        if (this.properties.length) code += `    ${this.getPropertiesCode()}\n`;
        if (this.constructorMethod) {
            code += this.constructorMethod.generate();
        }
        var staticMethods: Array<MethodGen> = [];
        for (var i = 0, il = this.methods.length; i < il; ++i) {
            if (this.methods[i].isStatic()) {
                staticMethods.push(this.methods[i]);
            } else {
                code += `\n${this.methods[i].generate()}`;
            }
        }
        // placing the static methods at the end of class body
        for (var i = 0, il = staticMethods.length; i < il; ++i) {
            code += `\n${staticMethods[i].generate()}`;
        }
        this.mixins.forEach(mixin => {
            code += mixin.code;
        });
        code += '}';
        return code;
    }
}
