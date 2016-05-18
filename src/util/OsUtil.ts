import {CmdUtil} from "./CmdUtil";

export class OsUtil {

    public static getOsVersion() {
        var output:string = CmdUtil.execSync(`lsb_release -a`).output;
        console.log(output.split('\n'));
    }

    public static getOsCodeName():string {
        return CmdUtil.getOutputOf(`lsb_release -c`).split(':')[1].trim();
    }

    public static getUserName():string {
        return CmdUtil.getOutputOf('echo $USER');
    }
}