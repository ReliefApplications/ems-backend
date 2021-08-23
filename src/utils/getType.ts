// import { Resource } from "../models";

// async function getResourceType(element) {
//     const validTypes = ['boolean', 'date', 'numeric', 'text'];
//     const resource: Resource = await Resource.findById(element.resource);
//     const field = resource.fields.find(obj => obj.name === element.displayField);
//     return validTypes.includes(field.type) ? field.type : 'text';
// }

async function getType(element) {
    switch (element.type) {
        case 'text':
            switch (element.inputType) {
                case 'text':
                    return 'text';
                case 'number':
                    return 'numeric';
                case 'color':
                    return 'color';
                case 'date':
                    return 'date';
                case 'datetime-local':
                    return 'datetime-local';
                case 'datetime':
                    return 'datetime';
                case 'time':
                    return 'time';
                default:
                    return 'text';
            }
        case 'file':
            return 'file';
        case 'expression': 
            switch (element.displayStyle) {
                case 'date':
                    return 'date';
                case 'decimal':
                    return 'decimal';
                case 'currency':
                    return 'decimal';
                case 'percent':
                    return 'decimal';
                case 'number':
                    return 'numeric';
                default:
                    return 'text';
            }
        case 'checkbox':
            return 'checkbox';
        case 'radiogroup':
            return 'radiogroup';
        case 'dropdown':
            return 'dropdown';
        case 'multipletext':
            return 'multipletext';
        case 'matrix':
                return 'matrix';
        case 'matrixdropdown':
            return 'matrixdropdown';
        case 'matrixdynamic':
            return 'matrixdynamic';
        case 'boolean':
            return 'boolean';
        case 'resource':
            return 'resource';
            // return await getResourceType(element);
        case 'resources':
            return 'resources';
            // return await getResourceType(element);
        case 'tagbox':
            return 'tagbox';
        case 'countries':
            return 'tagbox';
        case 'country':
            return 'dropdown';
        default:
            return 'text';
    }
}

export default getType;
