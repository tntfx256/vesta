import {CmdUtil} from "./CmdUtil";

export class OsUtil {

    public static getOsVersion() {
        var output:string = CmdUtil.execSync(`lsb_release -a`).output;
        console.log(output.split('\n'));
    }

    public static getOsCodeName() {
        return CmdUtil.getOutputOf(`lsb_release -c`).split(':')[1].trim();
    }
}