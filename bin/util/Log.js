"use strict";
var colors = require("colors");
var Log = (function () {
    function Log() {
    }
    Log.simple = function (message) {
        console.log(message);
    };
    Log.info = function (message) {
        Log.color('cyan', message);
    };
    Log.error = function (message) {
        Log.color('red', message);
    };
    Log.warning = function (message) {
        Log.color('yellow', message);
    };
    Log.success = function (message) {
        Log.color('green', message);
    };
    Log.color = function (color, message) {
        console.log(colors[color](message));
    };
    return Log;
}());
exports.Log = Log;
