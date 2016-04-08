"use strict";
var Platform = (function () {
    function Platform() {
    }
    Platform.getInfo = function () {
        if (Platform.hasInfo)
            return;
        Platform.type = typeof window === 'undefined' ? 'server' : 'client';
        if (Platform.type == 'client') {
            if (navigator.userAgent.match(/Android/i)) {
                Platform.isMobile = true;
                Platform.os = Platform.OS.Android;
            }
            else if (navigator.userAgent.match(/BlackBerry/i)) {
                Platform.isMobile = true;
                Platform.os = Platform.OS.BlackBerry;
            }
            else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
                Platform.isMobile = true;
                Platform.os = Platform.OS.IOS;
            }
            else if (navigator.userAgent.match(/Opera Mini/i)) {
                Platform.isMobile = true;
            }
            else if (navigator.userAgent.match(/IEMobile/i)) {
                Platform.isMobile = true;
            }
            else {
                Platform.isMobile = false;
            }
            Platform.platform = Platform.isMobile ? Platform.Platform.Device : Platform.Platform.Browser;
        }
        Platform.hasInfo = true;
    };
    Platform.isClient = function () {
        Platform.getInfo();
        return Platform.type == 'client';
    };
    Platform.isServer = function () {
        Platform.getInfo();
        return Platform.type == 'server';
    };
    Platform.isBrowser = function () {
        Platform.getInfo();
        return Platform.platform == Platform.Platform.Browser;
    };
    Platform.isDevice = function () {
        Platform.getInfo();
        return Platform.isMobile;
    };
    Platform.isAndroid = function () {
        Platform.getInfo();
        return Platform.os == Platform.OS.Android;
    };
    Platform.isIos = function () {
        Platform.getInfo();
        return Platform.os == Platform.OS.IOS;
    };
    Platform.Type = { ServerSide: 'server', ClientSide: 'client' };
    Platform.Platform = { Device: 'device', Browser: 'browser' };
    Platform.OS = { Windows: 'windows', Linux: 'linux', Android: 'android', IOS: 'ios', BlackBerry: 'bb' };
    return Platform;
}());
exports.Platform = Platform;
