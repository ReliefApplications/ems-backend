import { Resource } from "../models";


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
        const resource: Resource = await Resource.findById(element.resource);
        const field = resource.fields.find(obj => obj.name === element.displayField);
        return validTypes.includes(field.type)? field.type: 'text';
    default:
        return 'text';
    }
}

export default getType;