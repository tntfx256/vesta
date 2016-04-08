"use strict";
var Character = (function () {
    function Character() {
        this.SANE = "\u001B[0m";
        //
        this.BLACK = "\u001B[0;30m";
        this.RED = "\u001B[0;31m";
        this.GREEN = "\u001B[0;32m";
        this.YELLOW = "\u001B[0;33m";
        this.BLUE = "\u001B[0;34m";
        this.MAGENTA = "\u001B[0;35m";
        this.CYAN = "\u001B[0;36m";
        this.WHITE = "\u001B[0;37m";
        //
        this.DARK_BLACK = "\u001B[1;30m";
        this.DARK_RED = "\u001B[1;31m";
        this.DARK_GREEN = "\u001B[1;32m";
        this.DARK_YELLOW = "\u001B[1;33m";
        this.DARK_BLUE = "\u001B[1;34m";
        this.DARK_MAGENTA = "\u001B[1;35m";
        this.DARK_CYAN = "\u001B[1;36m";
        this.DARK_WHITE = "\u001B[1;37m";
        //
        this.BACKGROUND_BLACK = "\u001B[40m";
        this.BACKGROUND_RED = "\u001B[41m";
        this.BACKGROUND_GREEN = "\u001B[42m";
        this.BACKGROUND_YELLOW = "\u001B[43m";
        this.BACKGROUND_BLUE = "\u001B[44m";
        this.BACKGROUND_MAGENTA = "\u001B[45m";
        this.BACKGROUND_CYAN = "\u001B[46m";
        this.BACKGROUND_WHITE = "\u001B[47m";
    }
    return Character;
}());
exports.Character = Character;
