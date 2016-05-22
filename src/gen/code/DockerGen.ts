import {Util} from "../../util/Util";
import {IProjectGenConfig, ProjectGen} from "../ProjectGen";
import {Log} from "../../util/Log";
var speakeasy = require('speakeasy');

export class DockerGen {
    private port:number;

    constructor(private config:IProjectGenConfig) {
        var [, host, port] = /(http.+):(\d+)$/.exec(this.config.endpoint);
        if (!host) {
            Log.error('Invalid host name');
        }
        this.port = +port || 3000;
    }

    public compose() {
        var replace:any = {};
        if (this.config.type == ProjectGen.Type.ClientSide) {

        } else {
            replace = {
                '__DB_PASSWORD__': speakeasy['generate_key']({length: 16, symbols: false}).ascii,
                '__SALT__': speakeasy['generate_key']({length: 24}).ascii.replace(/\$/g, '-'),
                '__SECRET_KEY__': speakeasy['generate_key']({length: 64}).ascii.replace(/\$/g, '-'),
                'expressJsTemplate': this.config.name
            };
        }
        Util.findInFileAndReplace(`${this.config.name}/resources/docker/nginx.conf`, replace);
        Util.findInFileAndReplace(`${this.config.name}/resources/docker/docker-compose.yml`, replace);
        Util.findInFileAndReplace(`${this.config.name}/docker-compose.yml`, replace);
    }
}