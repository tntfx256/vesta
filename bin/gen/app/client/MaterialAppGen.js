"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ClientAppGen_1 = require("./ClientAppGen");
var MaterialAppGen = (function (_super) {
    __extends(MaterialAppGen, _super);
    function MaterialAppGen(config) {
        _super.call(this, config);
        this.config = config;
    }
    return MaterialAppGen;
}(ClientAppGen_1.ClientAppGen));
exports.MaterialAppGen = MaterialAppGen;
