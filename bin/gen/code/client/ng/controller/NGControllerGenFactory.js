"use strict";
var ClientAppGen_1 = require("../../../../app/client/ClientAppGen");
var MaterialControllerGen_1 = require("./MaterialControllerGen");
var IonicControllerGen_1 = require("./IonicControllerGen");
var ControllerGenFactory = (function () {
    function ControllerGenFactory() {
    }
    ControllerGenFactory.create = function (framework, config) {
        switch (framework) {
            case ClientAppGen_1.ClientAppGen.Framework.Material:
                return new MaterialControllerGen_1.MaterialControllerGen(config);
            case ClientAppGen_1.ClientAppGen.Framework.Ionic:
                return new IonicControllerGen_1.IonicControllerGen(config);
        }
        return null;
    };
    return ControllerGenFactory;
}());
exports.ControllerGenFactory = ControllerGenFactory;
