import {getOutputOf} from "./CmdUtil";

export function getOsCodeName(): string {
    return getOutputOf(`lsb_release -cs`).trim();
}

export function getKernelVersion() {
    return getOutputOf(`uname -r`).trim();
}