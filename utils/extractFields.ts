import { GraphQLError } from 'graphql/error';
import getType from './getType';
import errors from '../const/errors';

/*  Push in fields array all detected fields in the json structure of object.
    Function by induction.
*/
async function extractFields(object, fields) {
    if (object.elements) {
        for (const element of object.elements) {
            if (element.type === 'panel') {
                await extractFields(element, fields);
            } else {
                if (!element.valueName) {
                    throw new GraphQLError(errors.missingDataField);
                }
                const type = await getType(element);
                const field = {
                    type,
                    name: element.valueName,
                    isRequired: element.isRequired ? element.isRequired : false,
                };
                // ** Resource **
                if (element.type === 'resource') {
                    Object.assign(field, {
                        resource: element.resource,
                        displayField: element.displayField
                    })
                }
                // ** Multiple texts **
                if (field.type === 'multipletext') {
                    Object.assign(field, {
                        items: element.items.map(x => { return {
                            name: x.name,
                            label: x.title ? x.title : x.name
                        }})
                    })
                }
                // ** Dynamic matrix **
                if (field.type === 'matrixdropdown') {
                    Object.assign(field, {
                        rows: element.rows.map(x => { return {
                            name: x.value,
                            label: x.text
                        }}),
                        columns: element.columns.map(x => { return {
                            name: x.name,
                            label: x.title,
                            type: x.cellType ? x.cellType : element.cellType
                        }}),
                        choices: element.choices.map(x => {
                            return {
                                value: x.value ? x.value : x,
                                text: x.text ? x.text : x
                            }
                        })
                    })
                }
                // ** Single choice matrix **
                if (field.type === 'matrix') {
                    Object.assign(field, {
                        rows: element.rows.map(x => { return {
                            name: x.value,
                            label: x.text
                        }}),
                        columns: element.columns.map(x => { return {
                            name: x.value,
                            label: x.text
                        }})
                    })
                }
                // ** Dropdown **
                if (field.type === 'dropdown') {
                    Object.assign(field, {
                        ...!element.choicesByUrl && { choices: element.choices.map(x => {
                            return x.value ? {
                                value: x.value ? x.value : x,
                                text: x.text ? x.text : x
                            } : x;
                        }) },
                        ...element.choicesByUrl && { choicesByUrl: {
                            url: element.choicesByUrl.url,
                            ...element.choicesByUrl.path && { path: element.choicesByUrl.path },
                            value: element.choicesByUrl.valueName ? element.choicesByUrl.valueName : 'name',
                            text: element.choicesByUrl.titleName ? element.choicesByUrl.titleName : 'name',
                        } }
                    })
                }
                // ** Checkbox **
                if (field.type === 'checkbox') {
                    Object.assign(field, {
                        ...!element.choicesByUrl && { choices: element.choices.map(x => {
                            return x.value ? {
                                value: x.value ? x.value : x,
                                text: x.text ? x.text : x
                            } : x;
                        }) },
                        ...element.choicesByUrl && { choicesByUrl: {
                            url: element.choicesByUrl.url,
                            ...element.choicesByUrl.path && { path: element.choicesByUrl.path },
                            value: element.choicesByUrl.valueName ? element.choicesByUrl.valueName : 'name',
                            text: element.choicesByUrl.titleName ? element.choicesByUrl.titleName : 'name',
                        } }
                    })
                }
                fields.push(field);
            }
        }
    }
}

export default extractFields;