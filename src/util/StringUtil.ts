export class StringUtil {

    public static trimLineBreaks(string: string): string {
        if (!string) return string;
        return string.replace(/\r?\n|\r$/, '');
    }

    public static fix(string: string, length: number, align: string = 'left') {
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
    public static fcUpper(str: string) {
        if (!str.length) return str;
        return str[0].toUpperCase() + str.substr(1);
    }
}