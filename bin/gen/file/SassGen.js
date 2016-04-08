"use strict";
var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var Util_1 = require("../../util/Util");
var Placeholder_1 = require("../core/Placeholder");
var SassGen = (function () {
    function SassGen(name, type) {
        if (type === void 0) { type = SassGen.Type.Page; }
        this.name = name;
        this.type = type;
        this.basePath = 'src/scss';
    }
    SassGen.prototype.genFontSass = function () {
        var code = "@font-face {\n  font-family: '" + this.name + "';\n  src: url('#{$font-path}/" + this.name + ".eot?#iefix') format('embedded-opentype'),\n  url('#{$font-path}/" + this.name + ".woff') format('woff'),\n  url('#{$font-path}/" + this.name + ".ttf') format('truetype'),\n  url('#{$font-path}/" + this.name + ".svg#" + this.name + "') format('svg');\n  font-weight: normal;\n  font-style: normal;\n}\n";
        this.name = _.camelCase(this.name);
        var dir = path.join(this.basePath, 'fonts'), pattern = {};
        try {
            fs.mkdirpSync(dir);
        }
        catch (e) {
        }
        Util_1.Util.fs.writeFile(path.join(dir, "_" + this.name + ".scss"), code);
        pattern[Placeholder_1.Placeholder.SassFont] = Placeholder_1.Placeholder.SassFont + "\n@import 'fonts/" + this.name + "';";
        Util_1.Util.findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    };
    SassGen.prototype.genPageSass = function () {
        var code = "#" + this.name + "-page {\n}\n";
        var dir = path.join(this.basePath, 'pages'), pattern = {};
        try {
            fs.mkdirpSync(dir);
        }
        catch (e) {
        }
        Util_1.Util.fs.writeFile(path.join(dir, "_" + this.name + ".scss"), code);
        pattern[Placeholder_1.Placeholder.SassPage] = Placeholder_1.Placeholder.SassPage + "\n@import 'pages/" + this.name + "';";
        Util_1.Util.findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    };
    SassGen.prototype.genComponentSass = function () {
        var code = "." + this.name + " {\n}\n";
        var dir = path.join(this.basePath, 'components'), pattern = {};
        try {
            fs.mkdirpSync(dir);
        }
        catch (e) {
        }
        Util_1.Util.fs.writeFile(path.join(dir, "_" + this.name + ".scss"), code);
        pattern[Placeholder_1.Placeholder.SassComponent] = Placeholder_1.Placeholder.SassComponent + "\n@import 'components/" + this.name + "';";
        Util_1.Util.findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    };
    SassGen.prototype.genDirectiveSass = function () {
        var code = "." + this.name + " {\n}\n";
        var dir = path.join(this.basePath, 'directives'), pattern = {};
        try {
            fs.mkdirpSync(dir);
        }
        catch (e) {
        }
        Util_1.Util.fs.writeFile(path.join(dir, "_" + this.name + ".scss"), code);
        pattern[Placeholder_1.Placeholder.SassDirective] = Placeholder_1.Placeholder.SassDirective + "\n@import 'directives/" + this.name + "';";
        Util_1.Util.findInFileAndReplace(path.join(this.basePath, '_common.scss'), pattern, true);
    };
    SassGen.prototype.generate = function () {
        switch (this.type) {
            case SassGen.Type.Font:
                this.genFontSass();
                break;
            case SassGen.Type.Component:
                this.genComponentSass();
                break;
            case SassGen.Type.Directive:
                this.genDirectiveSass();
                break;
            case SassGen.Type.Page:
                this.genPageSass();
                break;
        }
    };
    SassGen.Type = { Font: 'font', Component: 'component', Directive: 'directive', Page: 'page' };
    return SassGen;
}());
exports.SassGen = SassGen;
