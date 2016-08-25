import * as _ from "lodash";
import {BaseNgFormGen} from "./BaseNgFormGen";
import {XMLGen} from "../../../../core/XMLGen";
import {INGFormWrapperConfig} from "../NGFormGen";
import {Field, IFieldProperties} from "vesta-schema/Field";
import {StringUtil} from "../../../../../util/StringUtil";

export class IonicFormGen extends BaseNgFormGen {


    protected genSelectField(wrapper: XMLGen, fieldName: string, properties: IFieldProperties): XMLGen {
        wrapper.addClass('item-select');
        var select = new XMLGen('select');
        properties.enum.forEach(item=> {
            select.append(new XMLGen('option').setAttribute('value', item).text(item));
        });
        return select;
    }

    private static getInputContainer(title?: string): XMLGen {
        var wrapper = new XMLGen('label');
        wrapper.addClass('item item-input item-floating-label');
        if (title) {
            var label = new XMLGen('span');
            label.text(title).addClass('input-label');
            wrapper.append(label);
        }
        return wrapper;
    }

    protected genElementForField(field: Field): XMLGen {
        var wrapper = IonicFormGen.getInputContainer(field.fieldName);
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    }

    wrap(config: INGFormWrapperConfig): XMLGen {
        var modelInstanceName = _.camelCase(this.schema.name),
            modelClassName = StringUtil.fcUpper(modelInstanceName),
            wrapper = new XMLGen(config.isModal ? 'ion-modal-view' : 'div'),
            form = new XMLGen('form');
        form.setAttribute('name', `vm.${modelInstanceName}Form`)
            .setAttribute('ng-submit', `vm.${config.type}${modelClassName}()`)
            .setAttribute('novalidate')
            .appendTo(wrapper);
        if (config.isModal) {
            var toolbar = new XMLGen('ion-header-bar'),
                actionBar = new XMLGen('div'),
                contentWrapper = new XMLGen('ion-content');
            toolbar.html(`
            <h1 class="title">${config.title}</h1>
            `);
            contentWrapper.html(`
            <div ng-include="'${config.formPath}'"></div>`);
            actionBar.html(`
            <button type="submit" class="button button-positive">${config.ok}</button>
            <button type="button" class="button button-light" ng-click="vm.closeFormModal()">${config.cancel}</button>`);
            form.append(toolbar, contentWrapper, actionBar);
        } else {
            wrapper.addClass('list');
            var contentWrapper = new XMLGen('div');
            contentWrapper.setAttribute('ng-include', `'${config.formPath}'`)
                .appendTo(form);
            // btns
        }
        return wrapper;
    }
}
