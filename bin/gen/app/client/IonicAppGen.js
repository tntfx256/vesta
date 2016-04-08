"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ClientAppGen_1 = require("./ClientAppGen");
var IonicAppGen = (function (_super) {
    __extends(IonicAppGen, _super);
    function IonicAppGen(config) {
        _super.call(this, config);
        this.config = config;
    }
    return IonicAppGen;
}(ClientAppGen_1.ClientAppGen));
exports.IonicAppGen = IonicAppGen;
