const { GraphQLError } = require('graphql/error');
const getType = require('./getType');

async function extractFields(object, fields) {
    for (const element of object.elements) {
        if (element.type === 'panel') {
            extractFields(element, fields);
        } else {
            if (!element.valueName) {
                throw new GraphQLError(
                    'Please add a value name to all questions, inside Data tab.'
                );
            }
            let type = await getType(element);
            fields.push({
                type: type,
                name: element.valueName,
                isRequired: element.isRequired ? element.isRequired : false,
                resource: element.type === 'resource' ? element.resource : null,
                displayField: element.type === 'resource' ? element.displayField : null
            });
        }
    }
}

module.exports = extractFields;