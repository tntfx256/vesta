import * as colors from "colors";

export class Log {
    public static simple(message: string) {
        console.log(message);
    }

    public static info(message: string) {
        Log.color('cyan', message);
    }

    public static error(message: string) {
        process.stderr.write(colors.red(message));
    }

    public static warning(message: string) {
        Log.color('yellow', message);
    }

    public static success(message: string) {
        Log.color('green', message);
    }

    public static color(color: string, message: string) {
        process.stdout.write(colors[color](message));
    }
}