"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var DateTime_1 = require("./DateTime");
var GregorianDate = (function (_super) {
    __extends(GregorianDate, _super);
    function GregorianDate() {
        _super.call(this);
        this.gregorianDate = new Date();
    }
    GregorianDate.prototype.setFullYear = function (year, month, date) {
        return this.gregorianDate.setFullYear(year, month, date);
    };
    GregorianDate.prototype.setMonth = function (month, date) {
        return this.gregorianDate.setMonth(month, date);
    };
    GregorianDate.prototype.setDate = function (date) {
        return this.gregorianDate.setDate(date);
    };
    GregorianDate.prototype.getFullYear = function () {
        return this.gregorianDate.getFullYear();
    };
    GregorianDate.prototype.getMonth = function () {
        return this.gregorianDate.getMonth();
    };
    GregorianDate.prototype.getDate = function () {
        return this.gregorianDate.getDate();
    };
    GregorianDate.prototype.getDay = function () {
        return this.gregorianDate.getDay();
    };
    GregorianDate.prototype.getHours = function () {
        return this.gregorianDate.getHours();
    };
    GregorianDate.prototype.getMinutes = function () {
        return this.gregorianDate.getMinutes();
    };
    GregorianDate.prototype.getSeconds = function () {
        return this.gregorianDate.getSeconds();
    };
    GregorianDate.prototype.setUTCFullYear = function (year, month, date) {
        return this.gregorianDate.setUTCFullYear(year, month, date);
    };
    GregorianDate.prototype.setUTCMonth = function (month, date) {
        return this.gregorianDate.setUTCMonth(month, date);
    };
    GregorianDate.prototype.setUTCDate = function (date) {
        return this.gregorianDate.setUTCDate(date);
    };
    GregorianDate.prototype.getUTCFullYear = function () {
        return this.gregorianDate.getUTCFullYear();
    };
    GregorianDate.prototype.getUTCMonth = function () {
        return this.gregorianDate.getUTCMonth();
    };
    GregorianDate.prototype.getUTCDate = function () {
        return this.gregorianDate.getUTCDate();
    };
    GregorianDate.prototype.getUTCDay = function () {
        return this.gregorianDate.getUTCDay();
    };
    GregorianDate.prototype.getTime = function () {
        return this.gregorianDate.getTime();
    };
    GregorianDate.prototype.setTime = function (time) {
        return this.gregorianDate.setTime(time);
    };
    GregorianDate.prototype.valueOf = function () {
        return this.gregorianDate.getTime();
    };
    GregorianDate.prototype.validateLocale = function (year, month, day) {
        var date = new Date(year, month, day), timestamp = date.getTime();
        if (isNaN(timestamp))
            return 0;
        return timestamp;
    };
    return GregorianDate;
}(DateTime_1.DateTime));
exports.GregorianDate = GregorianDate;
