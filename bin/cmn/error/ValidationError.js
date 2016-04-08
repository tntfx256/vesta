"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Err_1 = require('../Err');
var ValidationError = (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(violations, message) {
        _super.call(this, Err_1.Err.Code.Validation, message);
        this.violations = violations;
        this.message = message;
    }
    return ValidationError;
}(Err_1.Err));
exports.ValidationError = ValidationError;
