"use strict";
var StringUtil = (function () {
    function StringUtil() {
    }
    StringUtil.trimLineBreaks = function (string) {
        return string.replace(/\r?\n|\r$/, '');
    };
    return StringUtil;
}());
exports.StringUtil = StringUtil;
