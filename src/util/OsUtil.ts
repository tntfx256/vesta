import {CmdUtil} from "./CmdUtil";

export class OsUtil {

    public static getOsCodeName(): string {
        return CmdUtil.getOutputOf(`lsb_release -cs`).trim();
    }

    static getKernelVersion() {
        return CmdUtil.getOutputOf(`uname -r`).trim();
    }
}