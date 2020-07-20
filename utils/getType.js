/* eslint-disable no-case-declarations */
const Resource = require('../models/resource');

async function getType(element){
    const validTypes = ['boolean', 'date', 'numeric', 'text'];
    switch (element.type ) {
    case 'text':  
        switch (element.inputType) {
        case 'text':
            return 'text';
        case 'number':
            return 'numeric';
        case 'date':
            return 'date';
        default:
            return 'text';
        }
    case 'boolean':
        return 'boolean';
    case 'resource':
        let resource = await Resource.findById(element.resource);
        let field = resource.fields.find(obj => obj.name === element.displayField);
        return validTypes.includes(field.type)? field.type: 'text';
    default:
        return 'text';    
    }
}

module.exports = getType;