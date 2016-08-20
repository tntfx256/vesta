export class StringUtil {

    public static trimLineBreaks(string: string): string {
        return string.replace(/\r?\n|\r$/, '');
    }

    public static fix(string: string, length: number, align: string='left') {
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
}