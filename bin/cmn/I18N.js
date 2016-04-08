"use strict";
var I18N = (function () {
    function I18N() {
    }
    I18N.getLocale = function (locale) {
        return I18N.Locales[locale];
    };
    I18N.Locales = {
        'fa-IR': {
            code: 'fa-IR',
            lang: 'fa',
            country: 'Iran',
            countryCode: 'IR',
            dir: 'rtl',
            dateSep: '/',
            dateTimeSep: ' ',
            timeSep: ':',
            daysInMonth: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29],
            monthNames: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
            monthNamesShort: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
            weekDays: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنج شنبه', 'جمعه'],
            weekDaysShort: ['شنبه', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه'],
            am_pm: ['ق ظ', 'ب ظ'],
            defaultDateFormat: 'Y/m/d',
            defaultDateTimeFormat: 'Y/m/d H:i:s'
        },
        'en-US': {
            code: 'en-US',
            lang: 'en',
            country: 'USA',
            countryCode: 'US',
            dir: 'ltr',
            dateSep: '/',
            dateTimeSep: ' ',
            timeSep: ':',
            daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            weekDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            weekDaysShort: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            am_pm: ['am', 'pm'],
            defaultDateFormat: 'Y/m/d',
            defaultDateTimeFormat: 'Y/m/d H:i:s'
        }
    };
    return I18N;
}());
exports.I18N = I18N;
