import * as colors from "colors";

export class Log {
    public static write(message: string) {
        process.stdout.write(message);
    }

    public static info(message: string) {
        Log.color('cyan', message);
    }

    public static error(message: string) {
        process.stderr.write(`\n${colors.red(message)}`);
    }

    public static warning(message: string) {
        Log.color('yellow', message);
    }

    public static success(message: string) {
        Log.color('green', message);
    }

    public static color(color: string, message: string) {
        Log.write(`\n${colors[color](message)}`);
    }
}