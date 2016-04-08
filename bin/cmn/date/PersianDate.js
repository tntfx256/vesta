"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var DateTime_1 = require("./DateTime");
var PersianDate = (function (_super) {
    __extends(PersianDate, _super);
    function PersianDate() {
        _super.call(this);
        this.gregorianDate = new Date();
    }
    PersianDate.prototype.toGregorian = function (year, month, day) {
        var jy = year - 979;
        var jm = month - 1;
        var jd = day - 1;
        var j_day_no = 365 * jy + parseInt(jy / 33) * 8 + parseInt((jy % 33 + 3) / 4);
        for (var i = 0; i < jm; ++i)
            j_day_no += this.persianDaysInMonth[i];
        j_day_no += jd;
        var g_day_no = j_day_no + 79;
        var gy = 1600 + 400 * parseInt(g_day_no / 146097);
        /* 146097 = 365*400 + 400/4 - 400/100 + 400/400 */
        g_day_no = g_day_no % 146097;
        var leap = true;
        if (g_day_no >= 36525) {
            g_day_no--;
            gy += 100 * parseInt(g_day_no / 36524);
            /* 36524 = 365*100 + 100/4 - 100/100 */
            g_day_no = g_day_no % 36524;
            if (g_day_no >= 365)
                g_day_no++;
            else
                leap = false;
        }
        gy += 4 * parseInt(g_day_no / 1461);
        /* 1461 = 365*4 + 4/4 */
        g_day_no %= 1461;
        if (g_day_no >= 366) {
            leap = false;
            g_day_no--;
            gy += parseInt(g_day_no / 365);
            g_day_no = g_day_no % 365;
        }
        for (var i = 0; g_day_no >= this.gregorianDaysInMonth[i] + (i == 1 && leap ? 1 : 0); i++)
            g_day_no -= this.gregorianDaysInMonth[i] + (i == 1 && leap ? 1 : 0);
        var gm = i + 1;
        var gd = g_day_no + 1;
        return [gy, gm, gd];
    };
    PersianDate.prototype.toPersian = function (year, month, day) {
        //year = parseInt(year);
        //month = parseInt(month);
        //day = parseInt(day);
        var gy = year - 1600;
        var gm = month - 1;
        var gd = day - 1;
        var g_day_no = 365 * gy + parseInt((gy + 3) / 4) - parseInt((gy + 99) / 100) + parseInt((gy + 399) / 400);
        for (var i = 0; i < gm; ++i)
            g_day_no += this.gregorianDaysInMonth[i];
        if (gm > 1 && ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)))
            /* leap and after Feb */
            ++g_day_no;
        g_day_no += gd;
        var j_day_no = g_day_no - 79;
        var j_np = parseInt(j_day_no / 12053);
        j_day_no %= 12053;
        var jy = 979 + 33 * j_np + 4 * parseInt(j_day_no / 1461);
        j_day_no %= 1461;
        if (j_day_no >= 366) {
            jy += parseInt((j_day_no - 1) / 365);
            j_day_no = (j_day_no - 1) % 365;
        }
        for (var i = 0; i < 11 && j_day_no >= this.persianDaysInMonth[i]; ++i) {
            j_day_no -= this.persianDaysInMonth[i];
        }
        var jm = i + 1;
        var jd = j_day_no + 1;
        return [jy, jm, jd];
    };
    PersianDate.prototype.checkDate = function (year, month, day) {
        var dayOffset = 0;
        if (month == 12 && (year - 979) % 33 % 4) {
            dayOffset = 1;
        }
        return !(year < 0 || year > 32767 ||
            month < 1 || month > 12 ||
            day < 1 || day > (this.persianDaysInMonth[month - 1] + dayOffset));
    };
    PersianDate.prototype.setFullYear = function (year, month, date) {
        var persianDate = this.toPersian(this.gregorianDate.getFullYear(), this.gregorianDate.getMonth() + 1, this.gregorianDate.getDate());
        if (year < 100)
            year += 1300;
        persianDate[0] = year;
        if (month != undefined) {
            if (month > 11) {
                persianDate[0] += Math.floor(month / 12);
                month = month % 12;
            }
            persianDate[1] = month + 1;
        }
        if (date != undefined)
            persianDate[2] = date;
        var g = this.toGregorian(persianDate[0], persianDate[1], persianDate[2]);
        return this.gregorianDate.setFullYear(g[0], g[1] - 1, g[2]);
    };
    PersianDate.prototype.setMonth = function (month, date) {
        var gd = this.gregorianDate.getDate();
        var gm = this.gregorianDate.getMonth();
        var gy = this.gregorianDate.getFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        if (month > 11) {
            j[0] += Math.floor(month / 12);
            month = month % 12;
        }
        j[1] = month + 1;
        if (date != undefined)
            j[2] = date;
        var g = this.toGregorian(j[0], j[1], j[2]);
        return this.gregorianDate.setFullYear(g[0], g[1] - 1, g[2]);
    };
    PersianDate.prototype.setDate = function (d) {
        var gd = this.gregorianDate.getDate();
        var gm = this.gregorianDate.getMonth();
        var gy = this.gregorianDate.getFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        j[2] = d;
        var g = this.toGregorian(j[0], j[1], j[2]);
        return this.gregorianDate.setFullYear(g[0], g[1] - 1, g[2]);
    };
    PersianDate.prototype.getFullYear = function () {
        var gd = this.gregorianDate.getDate();
        var gm = this.gregorianDate.getMonth();
        var gy = this.gregorianDate.getFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        return j[0];
    };
    PersianDate.prototype.getMonth = function () {
        var gd = this.gregorianDate.getDate();
        var gm = this.gregorianDate.getMonth();
        var gy = this.gregorianDate.getFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        return j[1] - 1;
    };
    PersianDate.prototype.getDate = function () {
        var gd = this.gregorianDate.getDate();
        var gm = this.gregorianDate.getMonth();
        var gy = this.gregorianDate.getFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        return j[2];
    };
    PersianDate.prototype.getDay = function () {
        var day = this.gregorianDate.getDay();
        day = (day + 1) % 7;
        return day;
    };
    PersianDate.prototype.getHours = function () {
        return this.gregorianDate.getHours();
    };
    PersianDate.prototype.getMinutes = function () {
        return this.gregorianDate.getMinutes();
    };
    PersianDate.prototype.getSeconds = function () {
        return this.gregorianDate.getSeconds();
    };
    PersianDate.prototype.setUTCFullYear = function (year, month, date) {
        var gd = this.gregorianDate.getUTCDate();
        var gm = this.gregorianDate.getUTCMonth();
        var gy = this.gregorianDate.getUTCFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        if (year < 100)
            year += 1300;
        j[0] = year;
        if (month != undefined) {
            if (month > 11) {
                j[0] += Math.floor(month / 12);
                month = month % 12;
            }
            j[1] = month + 1;
        }
        if (date != undefined)
            j[2] = date;
        var g = this.toGregorian(j[0], j[1], j[2]);
        return this.gregorianDate.setUTCFullYear(g[0], g[1] - 1, g[2]);
    };
    PersianDate.prototype.setUTCMonth = function (month, date) {
        var gd = this.gregorianDate.getUTCDate();
        var gm = this.gregorianDate.getUTCMonth();
        var gy = this.gregorianDate.getUTCFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        if (month > 11) {
            j[0] += Math.floor(month / 12);
            month = month % 12;
        }
        j[1] = month + 1;
        if (date != undefined)
            j[2] = date;
        var g = this.toGregorian(j[0], j[1], j[2]);
        return this.gregorianDate.setUTCFullYear(g[0], g[1] - 1, g[2]);
    };
    PersianDate.prototype.setUTCDate = function (date) {
        var gd = this.gregorianDate.getUTCDate();
        var gm = this.gregorianDate.getUTCMonth();
        var gy = this.gregorianDate.getUTCFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        j[2] = date;
        var g = this.toGregorian(j[0], j[1], j[2]);
        return this.gregorianDate.setUTCFullYear(g[0], g[1] - 1, g[2]);
    };
    PersianDate.prototype.getUTCFullYear = function () {
        var gd = this.gregorianDate.getUTCDate();
        var gm = this.gregorianDate.getUTCMonth();
        var gy = this.gregorianDate.getUTCFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        return j[0];
    };
    PersianDate.prototype.getUTCMonth = function () {
        var gd = this.gregorianDate.getUTCDate();
        var gm = this.gregorianDate.getUTCMonth();
        var gy = this.gregorianDate.getUTCFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        return j[1] - 1;
    };
    PersianDate.prototype.getUTCDate = function () {
        var gd = this.gregorianDate.getUTCDate();
        var gm = this.gregorianDate.getUTCMonth();
        var gy = this.gregorianDate.getUTCFullYear();
        var j = this.toPersian(gy, gm + 1, gd);
        return j[2];
    };
    PersianDate.prototype.getUTCDay = function () {
        var day = this.gregorianDate.getUTCDay();
        day = (day + 1) % 7;
        return day;
    };
    PersianDate.prototype.getTime = function () {
        return this.gregorianDate.getTime();
    };
    PersianDate.prototype.setTime = function (time) {
        return this.gregorianDate.setTime(time);
    };
    PersianDate.prototype.valueOf = function () {
        return this.gregorianDate.getTime();
    };
    PersianDate.prototype.validateLocale = function (year, month, day) {
        var result = this.checkDate(year, month, day);
        if (result) {
            this.setFullYear(year, month, day);
            return this.gregorianDate.getTime();
        }
        return 0;
    };
    return PersianDate;
}(DateTime_1.DateTime));
exports.PersianDate = PersianDate;
