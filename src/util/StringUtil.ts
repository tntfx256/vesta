export class StringUtil {

    public static trimLineBreaks(string:string):string {
        return string.replace(/\r?\n|\r$/, '');
    }

}