"use strict";
var Dictionary_1 = require('./en-US/Dictionary');
var Dictionary_2 = require('./fa-IR/Dictionary');
var Dictionary = (function () {
    function Dictionary(locale) {
        this.collection = {};
        switch (locale) {
            case 'en-US':
                this.collection = Dictionary_1.Dictionary;
                break;
            default:
                this.collection = Dictionary_2.Dictionary;
        }
    }
    Dictionary.prototype.get = function (key) {
        return this.collection[key];
    };
    return Dictionary;
}());
exports.Dictionary = Dictionary;
