export function trimLineBreaks(string: string): string {
    if (!string) return string;
    return string.replace(/\r?\n|\r$/, '');
}

export function fix(string: string, length: number, align: string = 'left') {
    let offset = length - string.length;
    if (!offset) return string;
    if (offset > 0) {
        for (let i = offset; i--;) {
            if (align == 'right') {
                string = ' ' + string;
            } else if (align == 'left') {
                string += ' ';
            } else {
                // center
            }
        }
        return string;
    }
    // offset < 0
    return
}

/**
 * Uppercase only the first character in str
 */
export function fcUpper(str: string) {
    if (!str.length) return str;
    return str[0].toUpperCase() + str.substr(1);
}

export function camelCase(str: string) {
    if (!str.length) return str;
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

export function pascalCase(str: string) {
    if (!str.length) return str;
    return fcUpper(camelCase(str));
}

export function kebabCase(str: string) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function plural(name: string): string {
    let lastChar = name.charAt(name.length - 1).toLocaleLowerCase();
    if (['a', 'i', 'u', 's'].indexOf(lastChar) >= 0) {
        return name + 'es';
    }
    if (['y'].indexOf(name.charAt(name.length - 1)) >= 0) {
        return name.substr(0, name.length - 1) + 'ies';
    }
    return name + 's';
}

export function strRepeat(str: string, times: number): string {
    let v = "";
    for (let i = 0; i < times; i++) {
        v += str;
    }
    return v;
}