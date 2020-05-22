import { camelCase, upperFirst } from "lodash";

export function trimLineBreaks(text: string): string {
  if (!text) {
    return text;
  }
  return text.replace(/\r?\n|\r$/, "");
}

export function fix(text: string, length: number, align: string = "left") {
  const offset = length - text.length;
  if (!offset) {
    return text;
  }
  if (offset > 0) {
    for (let i = offset; i--; ) {
      if (align === "right") {
        text = " " + text;
      } else if (align === "left") {
        text += " ";
      } else {
        // center
      }
    }
    return text;
  }
  // offset < 0
  return;
}

export function pascalCase(str: string) {
  if (!str.length) {
    return str;
  }
  return upperFirst(camelCase(str));
}

export function kebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function plural(name: string): string {
  const lastChar = name.charAt(name.length - 1).toLocaleLowerCase();
  if (["a", "i", "u", "s"].indexOf(lastChar) >= 0) {
    return name + "es";
  }
  if (["y"].indexOf(name.charAt(name.length - 1)) >= 0) {
    return name.substr(0, name.length - 1) + "ies";
  }
  return name + "s";
}

export function strRepeat(str: string, times: number): string {
  let v = "";
  for (let i = 0; i < times; i++) {
    v += str;
  }
  return v;
}
