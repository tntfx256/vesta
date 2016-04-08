"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Err_1 = require('../Err');
var ResponseError = (function (_super) {
    __extends(ResponseError, _super);
    function ResponseError() {
        _super.apply(this, arguments);
    }
    return ResponseError;
}(Err_1.Err));
exports.ResponseError = ResponseError;
