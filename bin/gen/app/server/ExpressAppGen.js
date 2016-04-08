"use strict";
var Vesta_1 = require("../../file/Vesta");
var ExpressAppGen = (function () {
    function ExpressAppGen(config) {
        this.config = config;
        this.vesta = Vesta_1.Vesta.getInstance();
    }
    return ExpressAppGen;
}());
exports.ExpressAppGen = ExpressAppGen;
