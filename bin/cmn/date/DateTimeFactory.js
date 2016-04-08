"use strict";
var PersianDate_1 = require("./PersianDate");
var GregorianDate_1 = require("./GregorianDate");
var I18N_1 = require("../I18N");
var DateTimeFactory = (function () {
    function DateTimeFactory() {
    }
    DateTimeFactory.create = function (localeCode) {
        var date;
        switch (localeCode) {
            case 'fa-IR':
                date = new PersianDate_1.PersianDate();
                break;
            default:
                date = new GregorianDate_1.GregorianDate();
        }
        date.locale = I18N_1.I18N.getLocale(localeCode);
        return date;
    };
    return DateTimeFactory;
}());
exports.DateTimeFactory = DateTimeFactory;
