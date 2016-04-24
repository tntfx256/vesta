"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require("path");
var _ = require("lodash");
var BaseNGControllerGen_1 = require("./BaseNGControllerGen");
var XMLGen_1 = require("../../../../core/XMLGen");
var SassGen_1 = require("../../../../file/SassGen");
var FsUtil_1 = require("../../../../../util/FsUtil");
var IonicControllerGen = (function (_super) {
    __extends(IonicControllerGen, _super);
    function IonicControllerGen() {
        _super.apply(this, arguments);
    }
    IonicControllerGen.prototype.createEmptyTemplate = function () {
        var template = new XMLGen_1.XMLGen('ion-content'), pageName = _.camelCase(this.config.name);
        template.setAttribute('id', pageName + "-page");
        pageName = _.capitalize(_.camelCase(this.config.name));
        template.html("<h1>" + pageName + " Page</h1>");
        var sass = new SassGen_1.SassGen(this.config.name, SassGen_1.SassGen.Type.Page);
        sass.generate();
        FsUtil_1.FsUtil.writeFile(path.join(this.templatePath, _.camelCase(this.config.name) + '.html'), template.generate());
    };
    IonicControllerGen.prototype.setAsListController = function () {
    };
    IonicControllerGen.prototype.setAsAddController = function () {
        this.isSpecialController = true;
    };
    IonicControllerGen.prototype.setAsEditController = function () {
        this.isSpecialController = true;
    };
    return IonicControllerGen;
}(BaseNGControllerGen_1.BaseNGControllerGen));
exports.IonicControllerGen = IonicControllerGen;
