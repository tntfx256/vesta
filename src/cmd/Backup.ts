import {Backuper} from "../deploy/Backuper";
import {Log} from "../util/Log";

export class Backup {

    static backupProject(args: Array<string>) {
        Backuper.getDeployConfig(args)
            .then(config => {
                let backuper = new Backuper(config);
                backuper.backup();
            })
    }

    static parse(args: Array<string>) {
        if (!args.length || ['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Backup.help();
        }
        Backup.backupProject(args);
    }

    static help() {
        Log.write(`
Usage: vesta backup PATH

Backup all storage data into a single tar file

    PATH    The name of file that the previous deploy generates it
`);
    }
}