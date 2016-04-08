"use strict";
var Set = (function () {
    function Set() {
        this.collection = [];
    }
    Set.prototype.append = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        for (var i = items.length; i--;) {
            if (this.collection.indexOf(items[i]) < 0) {
                this.collection.push(items[i]);
            }
        }
    };
    Set.prototype.contain = function (item) {
        return this.collection.indexOf(item) >= 0;
    };
    Object.defineProperty(Set.prototype, "count", {
        get: function () {
            return this.collection.length;
        },
        enumerable: true,
        configurable: true
    });
    Set.prototype.remove = function (item) {
        var index = this.collection.indexOf(item);
        if (index >= 0) {
            this.collection.splice(index, 1);
        }
    };
    return Set;
}());
exports.Set = Set;
