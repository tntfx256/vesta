import { MethodGen } from "./MethodGen";
import { StructureGen } from "./StructureGen";
import { IMixin } from "./TSFileGen";

export class ClassGen extends StructureGen {
  public static Access = {
    Private: "private",
    Protected: "protected",
    Public: "public",
  };
  private mixins: IMixin[] = [];

  constructor(public name: string, public isAbstract: boolean = false) {
    super(name);
  }

  public addMixin(name: string, code: string) {
    this.mixins.push({ name, code });
  }

  public generate(): string {
    const exp = this.shouldBeExported ? "export " : "";
    const abs = this.isAbstract ? "abstract " : "";
    let code = `\n${exp}${abs}class ${this.name}`;
    if (this.parentClass) {
      code += " extends " + this.parentClass;
    }
    if (this.implementations.length) {
      code += " implements " + this.implementations.join(", ");
    }
    code += " {\n";

    if (this.properties.length) {
      code += `    ${this.getPropertiesCode()}\n`;
    }

    const methodsCodes = [];
    for (const method of this.methods) {
      if (method) {
        methodsCodes.push(method.generate());
      }
    }
    code += methodsCodes.join("\n\n");
    this.mixins.forEach((mixin) => {
      code += mixin.code;
    });
    code += "}";
    return code;
  }

  public setAsAbstract(isAbstract: boolean = true) {
    this.isAbstract = isAbstract;
  }

  private getPropertiesCode(): string {
    const codes = [];
    for (let i = 0, il = this.properties.length; i < il; ++i) {
      let code = (this.properties[i].access ? this.properties[i].access : "public") + " ";
      if (this.properties[i].isStatic) {
        code += "static ";
      }
      if (this.properties[i].readonly) {
        code += "readonly ";
      }
      code += this.properties[i].name;
      if (this.properties[i].isOptional) {
        code += "?";
      }
      if (this.properties[i].type) {
        code += `: ${this.properties[i].type}`;
      }
      if (this.properties[i].defaultValue) {
        code += ` = ${this.properties[i].defaultValue}`;
      }
      code += ";";
      codes.push(code);
    }
    return codes.join("\n    ");
  }
}
