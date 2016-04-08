"use strict";
var Platform_1 = require("./Platform");
var FileMemeType_1 = require("./FileMemeType");
var Validator = (function () {
    function Validator() {
    }
    /**
     *
     * @param {IModelValues} values {fieldName: fieldValue}
     * @param {IValidationModelSet} validationPatterns {fieldName: {ruleName: }}
     * @returns {IValidationErrors}
     */
    Validator.validate = function (values, validationPatterns) {
        var errors = null, valid = true;
        for (var fieldName in validationPatterns) {
            if (validationPatterns.hasOwnProperty(fieldName)) {
                var isRequired = validationPatterns[fieldName].hasOwnProperty('required');
                var hasValue = values.hasOwnProperty(fieldName);
                if (isRequired || hasValue) {
                    var result = Validator.validateField(values[fieldName], validationPatterns[fieldName], values, isRequired);
                    if (result) {
                        if (!errors)
                            errors = {};
                        errors[fieldName] = { rule: result };
                        valid = false;
                    }
                }
            }
        }
        return errors;
    };
    /**
     * Returns the name of the rule that has failed
     */
    Validator.validateField = function (value, validationRules, model, isRequired) {
        var result;
        if (isRequired) {
            result = Validator.ruleValidator.required(value, true);
            if (!result) {
                return 'required';
            }
        }
        for (var rule in validationRules) {
            if (validationRules.hasOwnProperty(rule)) {
                if (rule == 'type') {
                    rule = validationRules[rule];
                }
                if (rule != 'required') {
                    result = Validator.ruleValidator[rule](value, validationRules[rule], model);
                    if (!result) {
                        return rule;
                    }
                }
            }
        }
        return '';
    };
    Validator.regex = {
        'email': /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/i,
        'phone': /[0-9 \-]{8,15}/,
        'url': /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    };
    Validator.ruleValidator = {
        required: function (value, isRequired) {
            if (isRequired) {
                return [null, undefined, '', NaN].indexOf(value) == -1;
            }
            return true;
        },
        minLength: function (value, minLength) {
            return typeof value === 'string' && value.length >= minLength;
        },
        maxLength: function (value, maxLength) {
            return typeof value === 'string' && value.length <= maxLength;
        },
        pattern: function (value, regex) {
            return regex.exec(value);
        },
        min: function (value, min) {
            return value && value >= min;
        },
        max: function (value, max) {
            return value && value <= max;
        },
        assert: function (value, cb, allValues) {
            return cb(value, allValues);
        },
        maxSize: function (file, size) {
            return file.size && file.size <= size * 1024;
        },
        fileType: function (file, acceptedTypes) {
            if (Platform_1.Platform.isClient()) {
                if (!(file instanceof File)) {
                    return false;
                }
            }
            var part = file.name.split('.');
            var extension = part[part.length - 1];
            if (file.type == 'application/octet-stream' || !file.type || !FileMemeType_1.FileMemeType.isValid(file.type)) {
                var meme = FileMemeType_1.FileMemeType.getMeme(extension);
                for (var i = meme.length; i--;) {
                    if (acceptedTypes.indexOf(meme[i]) >= 0) {
                        return true;
                    }
                }
            }
            else {
                return acceptedTypes.indexOf(file.type) >= 0;
            }
            return false;
        },
        // field types; second arg is undefined
        enum: function (value, values) {
            return values.indexOf(value) >= 0;
        },
        email: function (email) {
            return Validator.regex.email.exec(email);
        },
        integer: function (number) {
            return !isNaN(parseInt(number));
        },
        number: function (number) {
            return !isNaN(+number);
        },
        float: function (number) {
            return !isNaN(parseFloat(number));
        },
        tel: function (phoneNumber) {
            return Validator.regex.phone.exec(phoneNumber);
        },
        boolean: function (bool) {
            return (bool === true || bool === false);
        },
        timestamp: function (timestamp) {
            return timestamp > 0;
        },
        relation: function (value) {
            return true;
        },
        url: function (url) {
            return Validator.regex.url.exec(url);
        },
        // mocks; prevents error
        default: function (value, defaultValue) {
            return true;
        },
        unique: function (value, isUnique) {
            return true;
        },
        primary: function (value, isPrimary) {
            return true;
        },
        string: function (value) {
            return true;
        },
        password: function (value) {
            return true;
        },
        file: function (value) {
            return true;
        },
        object: function (value) {
            return true;
        }
    };
    return Validator;
}());
exports.Validator = Validator;
