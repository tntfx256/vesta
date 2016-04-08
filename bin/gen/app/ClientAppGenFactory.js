"use strict";
var ClientAppGen_1 = require("./client/ClientAppGen");
var MaterialAppGen_1 = require("./client/MaterialAppGen");
var IonicAppGen_1 = require("./client/IonicAppGen");
var ClientAppGenFactory = (function () {
    function ClientAppGenFactory() {
    }
    ClientAppGenFactory.create = function (config) {
        switch (config.client.framework) {
            case ClientAppGen_1.ClientAppGen.Framework.Material:
                return new MaterialAppGen_1.MaterialAppGen(config);
            case ClientAppGen_1.ClientAppGen.Framework.Ionic:
                return new IonicAppGen_1.IonicAppGen(config);
        }
        return null;
    };
    return ClientAppGenFactory;
}());
exports.ClientAppGenFactory = ClientAppGenFactory;
