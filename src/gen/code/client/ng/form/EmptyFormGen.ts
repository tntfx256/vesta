import {BaseFormGen} from "./BaseFormGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {XMLGen} from "../../../../core/XMLGen";
import {Field} from "vesta-schema/Field";

export class EmptyFormGen extends BaseFormGen {

    protected genElementForField(field:Field):XMLGen {
        var wrapper = new XMLGen('div');
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    }

    public wrap(config:INGFormWrapperConfig):XMLGen {
        var wrapper = new XMLGen(config.isModal ? 'md-dialog' : 'div'),
            form = new XMLGen('form');
        wrapper.setAttribute('aria-label', config.title);
        form.setAttribute('name', `vm.sampleForm`)
            .setAttribute('ng-submit', `vm.${config.type}Sample()`)
            .setAttribute('novalidate')
            .appendTo(wrapper);
        var contentWrapper = new XMLGen('div');
        contentWrapper.setAttribute('ng-include', `'${config.formPath}'`).appendTo(form);
        return wrapper;
    }
}