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
                    resource: element.type === 'resource' ? element.resource : null,
                    displayField: element.type === 'resource' ? element.displayField : null
                };
                if (field.type === 'matrixdropdown') {
                    Object.assign(field, {
                        rows: element.rows.map(x => { return { name: x.value }}),
                        columns: element.columns.map(x => { return {
                            name: x.name
                        }})
                    })
                }
                if (field.type === 'matrix') {
                    Object.assign(field, {
                        rows: element.rows.map(x => { return { name: x.value }})
                    })
                }
                fields.push(field);
            }
        }
    }
}

export default extractFields;