import * as fse from "fs-extra";
import {Log} from "./Log";

export class Fs {
    public static mkdir(...dirs:Array<string>):void {
        dirs.forEach(dir=> {
            try {
                fse.mkdirpSync(dir);
            } catch (e) {
                Log.error(`mkdir: ${e.message}`);
            }
        })
    };

    public static writeFile(path:string, content:string) {
        try {
            fse.writeFileSync(path, content);
        } catch (e) {
            Log.error(`writeFile: ${e.message}`);
        }
    }

    public static copy(src:string, dest:string) {
        try {
            fse.copySync(src, dest);
        } catch (e) {
            Log.error(`copy: ${e.message}`);
        }
    }

    public static rename(src:string, dest:string) {
        try {
            fse.renameSync(src, dest);
        } catch (e) {
            Log.error(`rename: ${e.message}`);
        }
    }

    public static remove(path:string) {
        try {
            fse.removeSync(path);
        } catch (e) {
            Log.error(`remove: ${e.message}`);
        }
    }
}