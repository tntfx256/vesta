import {Util} from "../../util/Util";
import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
var speakeasy = require('speakeasy');

export class DockerGen {
    private port:number;

    constructor(private config:IProjectGenConfig) {
        var [, host, port] = /(http.+):(\d+)$/.exec(this.config.endpoint);
        if (!host) {
            Util.log.error('Invalid host name');
        }
        this.port = +port || 3000;
    }

    public compose() {
        var replace:any = {},
            devPort = Math.floor(Math.random() * 100);
        if (this.config.type == ProjectGen.Type.ClientSide) {

        } else {
            replace = {
                '__DB_ROOT_PASSWORD__': speakeasy['generate_key']({length: 8, symbols: false}).ascii,
                '__SALT__': speakeasy['generate_key']({length: 24}).ascii.replace(/\$/g, '-'),
                '__SECRET_KEY__': speakeasy['generate_key']({length: 64}).ascii.replace(/\$/g, '-'),
                'expressJsTemplate': this.config.name,
                '3000': this.port, // api server
                '3100': `31${devPort}`, // session database
                '3200': `32${devPort}`, // app database
                '3300': `33${devPort}`, // node debug
                '3400': `34${devPort}`, // static app
                '3500': `35${devPort}`, // static app debug
            };
        }
        Util.findInFileAndReplace(`${this.config.name}/resources/docker/compose-dev.yml`, replace);
        Util.findInFileAndReplace(`${this.config.name}/resources/docker/compose-prod.yml`, replace);
    }
}