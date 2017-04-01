import {Vesta} from "../gen/file/Vesta";
export class Client {

    private static createProject() {

    }


    static parse(args: Array<string>) {
        if (!args.length || ['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Client.help();
        }
        Client.createProject();
    }

    static help() {
        process.stdout.write(`
Usage: vesta client add|remove CLIENT_TECHNOLOGY

Managing client side technologies

    CLIENT_TECHNOLOGY    Type of client (web, cordova, electron)

Options:
    -h,--help       Display this help
`);
    }
}