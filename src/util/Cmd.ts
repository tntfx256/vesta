import * as shell from "shelljs";
import {ExecOptions, ExecOutputReturnValue} from "shelljs";
import {Log} from "./Log";

export interface IExecSyncResult extends ExecOutputReturnValue {

}

export interface IExecOptions extends ExecOptions {
    cwd?:string;
    stdio?:any;
    customFds?:any;
    env?:any;
    encoding?:string;
    timeout?:number;
    maxBuffer?:number;
    killSignal?:string;
}

export class Cmd {

    static execSync(command, options?:IExecOptions):IExecSyncResult {
        options = options || {};
        if (!options.silent) {
            Log.info(`${options.cwd || '.'}/> ${command} `);
        }
        return <ExecOutputReturnValue>shell.exec(command, options);
    }
}