"use strict";
var Util_1 = require("../../util/Util");
var ProjectGen_1 = require("../ProjectGen");
var speakeasy = require('speakeasy');
var DockerGen = (function () {
    function DockerGen(config) {
        this.config = config;
        var _a = /(http.+):(\d+)$/.exec(this.config.endpoint), host = _a[1], port = _a[2];
        if (!host) {
            Util_1.Util.log.error('Invalid host name');
        }
        this.port = +port || 3000;
    }
    DockerGen.prototype.compose = function () {
        var replace = {}, devPort = Math.floor(Math.random() * 100);
        if (this.config.type == ProjectGen_1.ProjectGen.Type.ClientSide) {
        }
        else {
            replace = {
                '__DB_ROOT_PASSWORD__': speakeasy['generate_key']({ length: 8, symbols: false }).ascii,
                '__SALT__': speakeasy['generate_key']({ length: 24 }).ascii.replace(/\$/g, '-'),
                '__SECRET_KEY__': speakeasy['generate_key']({ length: 64 }).ascii.replace(/\$/g, '-'),
                'sampleDatabase': this.config.name,
                'expressCodeTemplate': this.config.name,
                '3000': this.port,
                '3100': "31" + devPort,
                '3200': "32" + devPort,
                '3300': "33" + devPort,
                '3400': "34" + devPort,
                '3500': "35" + devPort,
            };
        }
        Util_1.Util.findInFileAndReplace(this.config.name + "/resources/docker/compose-dev.yml", replace);
        Util_1.Util.findInFileAndReplace(this.config.name + "/resources/docker/compose-prod.yml", replace);
    };
    return DockerGen;
}());
exports.DockerGen = DockerGen;
