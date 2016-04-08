"use strict";
var fs = require("fs-extra");
var Util_1 = require("../../util/Util");
var Config_1 = require("../../Config");
var Vesta = (function () {
    function Vesta(config) {
        if (config === void 0) { config = null; }
        this.config = config;
        this.path = 'vesta.json';
        this.isUpdate = false;
        if (config) {
            this.json = {
                version: { app: '0.1.0', api: 'v1' },
                config: config
            };
        }
        else {
            this.isUpdate = true;
            try {
                if (!fs.existsSync(this.path)) {
                    Util_1.Util.log.error('`vesta.json` not found. Make sure you are in the correct directory');
                    process.exit();
                }
                this.json = JSON.parse(fs.readFileSync(this.path, { encoding: 'utf8' }));
            }
            catch (e) {
                Util_1.Util.log.error(e);
                process.exit();
            }
        }
    }
    Vesta.prototype.generate = function () {
        if (this.isUpdate) {
            Util_1.Util.log.error('Invalid operation');
        }
        else {
            var path = this.config.name;
            delete this.config.repository['firstTime'];
            Util_1.Util.fs.writeFile(path + '/vesta.json', JSON.stringify(this.json));
        }
    };
    Vesta.getInstance = function (config) {
        if (config === void 0) { config = null; }
        if (!Vesta.instance) {
            Vesta.instance = new Vesta(config);
        }
        return Vesta.instance;
    };
    Vesta.prototype.getConfig = function () {
        return this.json.config;
    };
    Vesta.prototype.getProjectConfig = function () {
        return Vesta.projectConfig;
    };
    Vesta.prototype.getVersion = function () {
        return this.json.version;
    };
    Vesta.projectConfig = Config_1.Config;
    return Vesta;
}());
exports.Vesta = Vesta;
