import * as fse from "fs-extra";
import {Log} from "./Log";

export class FsUtil {
    public static mkdir(...dirs: Array<string>): void {
        dirs.forEach(dir => {
            // Log.info(`./> mkdir -p ${dir}`);
            try {
                fse.mkdirpSync(dir);
            } catch (e) {
                Log.error(`mkdir: ${e.message}`);
            }
        })
    };

    public static readJsonFile(path: string) {
        try {
            return JSON.parse(fse.readFileSync(path, {encoding: 'utf8'}));
        } catch (e) {
            Log.error(`Invalid json file: ${path}`);
            return null;
        }
    }

    public static writeFile(path: string, content: string) {
        try {
            fse.writeFileSync(path, content);
        } catch (e) {
            Log.error(`writeFile: ${e.message}`);
        }
    }

    public static copy(src: string, dest: string) {
        Log.info(`./> cp ${src} ${dest}`);
        try {
            fse.copySync(src, dest);
        } catch (e) {
            Log.error(`copy: ${e.message}`);
        }
    }

    public static rename(src: string, dest: string) {
        Log.info(`./> mv ${src} ${dest}`);
        try {
            fse.renameSync(src, dest);
        } catch (e) {
            Log.error(`rename: ${e.message}`);
        }
    }

    public static remove(...path: Array<string>) {
        path.forEach(p => {
            Log.info(`./> rm -rf ${p}`);
            try {
                fse.removeSync(p);
            } catch (e) {
                Log.error(`remove: ${e.message}`);
            }
        })
    }

    public static unixPath(path: string) {
        return path.replace(/\\/g, '/');
    }
}