import * as colors from "colors";

export class Log {
    public static simple(message: string) {
        console.log(message);
    }

    public static info(message: string) {
        Log.color('cyan', message);
    }

    public static error(message: string) {
        Log.color('red', message);
    }

    public static warning(message: string) {
        Log.color('yellow', message);
    }

    public static success(message: string) {
        Log.color('green', message);
    }

    public static color(color: string, message: string) {
        console.log(colors[color](message));
    }
}