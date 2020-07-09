const { GraphQLError } = require('graphql/error');

function extractFields(object, fields) {
    for (const element of object.elements) {
        if (element.type === 'panel') {
            extractFields(element, fields);
        } else {
            if (!element.valueName) {
                throw new GraphQLError(
                    'Please add a value name to all questions, inside Data tab.'
                );
            }
            fields.push({
                type: element.type,
                name: element.valueName,
                isRequired: element.isRequired ? element.isRequired : false
            });
        }
    }
}

module.exports = extractFields;