import { pascalCase } from "../../util/StringUtil";

export class EnumGen {
  public name: string;
  protected shouldBeExported: boolean = true;
  private enums: string[] = [];

  constructor(name: string) {
    this.name = pascalCase(name);
  }

  public shouldExport(shouldBeExported: boolean = true) {
    this.shouldBeExported = shouldBeExported;
  }

  public addEnum(name: string) {
    if (!name) {
      return;
    }
    const key = name.toUpperCase();
    if (this.enums.includes(key)) {
      return;
    }
    this.enums.push(key);
  }

  public get first() {
    return this.enums[0];
  }

  public generate(): string {
    let code = this.shouldBeExported ? "export " : "";
    const props: string[] = [];
    code += `enum ${this.name} {`;
    for (const key of this.enums) {
      props.push(`${key} = "${key}"`);
    }
    code = `${code}${props.join(",")}}`;
    return code;
  }
}
