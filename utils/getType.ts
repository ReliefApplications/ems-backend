import { Resource } from "../models";


async function getType(element) {
    const validTypes = ['boolean', 'date', 'numeric', 'text'];
    switch (element.type) {
        case 'text':
            switch (element.inputType) {
                case 'text':
                    return 'text';
                case 'number':
                    return 'numeric';
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
        case 'matrix':
                return 'matrix';
        case 'matrixdropdown':
            return 'matrixdropdown';
        case 'boolean':
            return 'boolean';
        case 'resource':
            const resource: Resource = await Resource.findById(element.resource);
            const field = resource.fields.find(obj => obj.name === element.displayField);
            return validTypes.includes(field.type) ? field.type : 'text';
        default:
            return 'text';
    }
}

export default getType;