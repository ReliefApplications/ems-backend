function extractFields(object, fields) {
    for (const element of object.elements) {
        if (element.type === 'panel') {
            extractFields(element, fields);
        } else {
            fields.push({
                type: element.type,
                name: element.valueName ? element.valueName : element.name,
                isRequired: element.isRequired ? element.isRequired : false
            });
        }
    }
}

module.exports = extractFields;