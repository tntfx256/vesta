import * as fse from "fs-extra";
import { relative } from "path";
import { Log } from "./Log";

export function mkdir(...dirs: Array<string>): void {
    dirs.forEach((dir) => {
        // Log.info(`./> mkdir -p ${dir}`);
        try {
            fse.mkdirpSync(dir);
        } catch (e) {
            Log.error(`mkdir: ${e.message}`);
        }
    });
}

export function readJsonFile<T>(path: string) {
    try {
        return JSON.parse(fse.readFileSync(path, { encoding: "utf8" })) as T;
    } catch (e) {
        Log.error(`Invalid json file: ${path}`);
        return null;
    }
}

export function writeFile(path: string, content: string) {
    try {
        fse.writeFileSync(path, content);
    } catch (e) {
        Log.error(`writeFile: ${e.message}`);
    }
}

export function copy(src: string, dest: string) {
    Log.info(`./> cp ${src} ${dest}`);
    try {
        fse.copySync(src, dest);
    } catch (e) {
        Log.error(`copy: ${e.message}`);
    }
}

export function rename(src: string, dest: string) {
    Log.info(`./> mv ${src} ${dest}`);
    try {
        fse.renameSync(src, dest);
    } catch (e) {
        Log.error(`rename: ${e.message}`);
    }
}

export function remove(...path: Array<string>) {
    path.forEach((p) => {
        Log.info(`./> rm -rf ${p}`);
        try {
            fse.removeSync(p);
        } catch (e) {
            Log.error(`remove: ${e.message}`);
        }
    });
}

export function unixPath(path: string) {
    return path.replace(/\\/g, "/");
}

export function genRelativePath(from: string, to: string): string {
    let relPath = relative(from, to).replace(/\\/g, "/").replace(/\.ts$/, "");
    if (relPath.charAt(0) != ".") {
        relPath = "./" + relPath;
    }
    return relPath;
}
