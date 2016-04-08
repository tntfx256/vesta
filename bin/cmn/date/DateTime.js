"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var DateTime = (function (_super) {
    __extends(DateTime, _super);
    function DateTime() {
        _super.apply(this, arguments);
        this.gregorianDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        this.persianDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
        this.char2param = {
            Y: 'FullYear',
            y: 'Year',
            n: 'Month',
            m: 'Month',
            M: 'Month',
            d: 'Date',
            j: 'Date',
            D: 'Day',
            l: 'Day',
            h: 'Hours',
            H: 'Hours',
            i: 'Minutes',
            s: 'Seconds'
        };
        this.sameValues = ['h', 'H', 'i', 's'];
        this.leadingZeros = ['d', 'm', 'H', 'h', 'i', 's'];
    }
    DateTime.prototype.addZero = function (param) {
        return (param < 10 ? '0' : '') + param;
    };
    DateTime.prototype._getEqParam = function (char) {
        var param = char;
        if (this.char2param[char]) {
            var getter = "get" + this.char2param[char];
            param = this[getter]();
            switch (char) {
                case 'D':
                    param = this.locale.weekDaysShort[param];
                    break;
                case 'l':
                    param = this.locale.weekDays[param];
                    break;
                case 'M':
                    param = this.locale.monthNamesShort[param];
                    break;
                case 'h':
                    param = param % 12;
                    break;
                case 'm':
                    param++;
            }
            if (this.leadingZeros.indexOf(char) >= 0) {
                param = this.addZero(param);
            }
        }
        return param;
    };
    ;
    DateTime.prototype.validateTime = function (hour, minute, second) {
        if (minute === void 0) { minute = 0; }
        if (second === void 0) { second = 0; }
        var milliseconds = 0;
        if (0 < hour && hour < 25)
            milliseconds += hour * 60 * 60;
        if (0 < minute && minute < 60)
            milliseconds += minute * 60;
        if (0 < second && second < 60)
            milliseconds += second;
        return milliseconds * 1000;
    };
    DateTime.prototype.validate = function (date, hasTime) {
        if (hasTime === void 0) { hasTime = false; }
        var result = 0;
        if (!date)
            return result;
        var _a = date.split(this.locale.dateTimeSep), dateStr = _a[0], timeStr = _a[1];
        if (!dateStr)
            return result;
        var dateParts = dateStr.split(this.locale.dateSep);
        if (!dateParts || dateParts.length != 3)
            return result;
        result = this.validateLocale(+dateParts[0], +dateParts[1], +dateParts[2]);
        if (hasTime && timeStr) {
            var timeParts = timeStr.split(this.locale.timeSep);
            if (timeParts.length >= 2) {
                result += this.validateTime(+timeParts[0], +timeParts[1], +timeParts[2]);
            }
        }
        return result;
    };
    DateTime.prototype.format = function (format) {
        var parsed = '';
        for (var i = 0, il = format.length; i < il; ++i) {
            parsed += this._getEqParam(format[i]);
        }
        return parsed;
    };
    return DateTime;
}(Date));
exports.DateTime = DateTime;
