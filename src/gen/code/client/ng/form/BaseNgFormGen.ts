import * as _ from "lodash";
import {XMLGen} from "../../../../core/XMLGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {Schema} from "vesta-schema/Schema";
import {IModelFields, IModel} from "vesta-schema/Model";
import {IFieldProperties, FieldType, Field} from "vesta-schema/Field";
import {ModelGen} from "../../../ModelGen";

/**
 * @classdesc This is the base class for framework based classed common codes.
 * Classes like MaterialFormGen and IonicFormGen will be extending this class and implements their own
 *  rendering system
 */
export abstract class BaseNgFormGen {
    protected schema:Schema;
    protected fields:IModelFields;

    constructor(protected model:IModel) {
        if (model) {
            this.schema = model.schema;
            this.fields = this.schema.getFields();
        }
    }

    protected genTextInputField():XMLGen {
        let input = new XMLGen('input', true);
        input.setAttribute('type', 'text');
        return input;
    }

    protected genTextField():XMLGen {
        let input = new XMLGen('textarea');
        input.setAttribute('resize', 'y');
        return input;
    }

    protected genTypedInputField(type:string):XMLGen {
        let input = new XMLGen('input', true);
        input.setAttribute('type', type).setAttribute('dir', 'ltr');
        return input;
    }

    protected genNumberInputField(isFloat:boolean = false):XMLGen {
        let input = new XMLGen('input', true);
        input.setAttribute('type', 'number').setAttribute('dir', 'ltr');
        input.setAttribute('step', isFloat ? 0.01 : 1);
        return input;
    }

    protected genFileField(fileType:Array<string>, isMultiple = false):XMLGen {
        let input = new XMLGen('input', true);
        input.setAttribute('type', 'file').setAttribute('file-upload');
        if (fileType.length) {
            input.setAttribute('accept', fileType.join(','));
        }
        if (isMultiple) {
            input.setAttribute('multiple');
        }
        return input;
    }

    protected genDateTimeField():XMLGen {
        let input = new XMLGen('input', true);
        input.setAttribute('dir', 'ltr').setAttribute('date-input').setAttribute('show-picker', 'true');
        return input;
    }

    protected genCheckboxField():XMLGen {
        let input = new XMLGen('input', true);
        input.setAttribute('type', 'checkbox');
        return input;
    }

    protected genSelectField(wrapper:XMLGen, fieldName:string, properties:IFieldProperties):XMLGen {
        let select = new XMLGen('select');
        properties.enum.forEach(item=> {
            select.append(new XMLGen('option').setAttribute('value', item).text(item));
        });
        return select;
    }

    /**
     * This method must return <div ng-messages>...<div ng-message></div>...</div>
     */
    protected getNgMessage(fieldName:string, properties:IFieldProperties):XMLGen {
        let modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name)),
            formName = `${modelInstanceName}Form`;
        let ngMessages = new XMLGen('div');
        ngMessages.setAttribute('ng-if', `vm.${formName}.$dirty`).setAttribute('ng-messages', `vm.${formName}.${fieldName}.$error`);
        if (properties.required) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'required').text('This field is required'));
        }
        if (properties.unique) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'unique').text('Duplicate Entry'));
        }
        if (properties.min) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'min').text(`Value must be greater than ${properties.min}`));
        }
        if (properties.max) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'max').text(`Value must be less than ${properties.max}`));
        }
        if (properties.minLength) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'minLength').text(`Characters must be longer than ${properties.minLength}`));
        }
        if (properties.maxLength) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'maxLength').text(`Characters must be longer than ${properties.maxLength}`));
        }
        if (properties.fileType.length) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'fileType').text(`File type is not supported`));
        }
        if (properties.maxSize) {
            ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'maxSize').text(`File size should be less than ${properties.maxSize} KB`));
        }
        switch (properties.type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Password:
                break;
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
                ngMessages.append(new XMLGen('div').setAttribute('ng-message', properties.type).text(`Invalid ${properties.type}`));
                break;
            case FieldType.Float:
            case FieldType.Number:
            case FieldType.Integer:
                break;
            case FieldType.File:
                break;
            case FieldType.Timestamp:
                ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'date').text(`Invalid date`));
                break;
            case FieldType.Boolean:
                break;
            case FieldType.Enum:
                ngMessages.append(new XMLGen('div').setAttribute('ng-message', 'enum').text(`Value must be one of the list items`));
                break;
        }
        return ngMessages;
    };

    /**
     * This method appends the form control and other required elements to the wrapper element
     */
    protected getElementsByFieldType(wrapper:XMLGen, fieldName:string, properties:IFieldProperties):void {
        let modelInstanceName = _.camelCase(ModelGen.extractModelName(this.schema.name)),
            input = new XMLGen('input', true);
        switch (properties.type) {
            case FieldType.String:
                input = this.genTextInputField();
                break;
            case FieldType.Text:
                input = this.genTextField();
                break;
            case FieldType.Password:
                input = this.genTypedInputField('password');
                break;
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
                this.genTypedInputField(FieldType[properties.type]);
                break;
            case FieldType.Float:
            case FieldType.Number:
            case FieldType.Integer:
                input = this.genNumberInputField(properties.type == FieldType.Float);
                break;
            case FieldType.File:
                input = this.genFileField(properties.fileType, properties.list == FieldType.File);
                break;
            case FieldType.Timestamp:
                input = this.genDateTimeField();
                break;
            case FieldType.Boolean:
                input = this.genCheckboxField();
                break;
            case FieldType.Enum:
                input = this.genSelectField(wrapper, fieldName, properties);
                break;
            // other types are taken care in the caller method
        }
        input.setAttribute('name', fieldName)
            .setAttribute('id', fieldName)
            .setAttribute('ng-model', `vm.${modelInstanceName}.${fieldName}`)
            .setAttribute('ng-model-options', `{debounce:500}`);
        wrapper.append(input);
        if (properties.required) input.setAttribute('required');
        if (properties.min) input.setAttribute('min', properties.min);
        if (properties.max) input.setAttribute('max', properties.max);
        if (properties.minLength) input.setAttribute('minlength', properties.minLength);
        if (properties.maxLength) input.setAttribute('maxlength', properties.maxLength);
        if (properties.fileType && properties.fileType.length) input.setAttribute('accept', properties.fileType.join(','));
        let ngMessages = this.getNgMessage(fieldName, properties);
        if (ngMessages.getChildren().length) wrapper.append(ngMessages);
    }

    public generate():string {
        let fields = Object.keys(this.fields),
            codes:Array<string> = [];
        fields.forEach(fieldName=> {
            if (fieldName != 'id') {
                let elm = this.genElementForField(this.fields[fieldName]);
                elm && codes.push(elm.generate());
            }
        });
        return codes.join('\n\n');
    }

    /**
     * generates the wrapper for each field and then fills the wrapper
     *  with proper form element using this.getElementsByFieldType
     */
    protected abstract genElementForField(field:Field):XMLGen;

    public abstract wrap(config:INGFormWrapperConfig):XMLGen;
}
