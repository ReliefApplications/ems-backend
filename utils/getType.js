/* eslint-disable no-case-declarations */
const Resource = require('../models/resource');

async function getType(element){
    const validTypes = ['boolean', 'date', 'numeric', 'string'];
    switch (element.type ) {
    case 'text':  
        switch (element.inputType) {
        case 'text':
            return 'string';
        case 'number':
            return 'numeric';
        case 'date':
            return 'date';
        default:
            return 'string';
        }
    case 'boolean':
        return 'boolean';
    case 'resource':
        let resource = await Resource.findById(element.resource);
        let field = resource.fields.find(obj => obj.name === element.displayField);
        return validTypes.includes(field.type)? field.type: 'string';
    default:
        return 'string';    
    }
}

module.exports = getType;