const AUTHORIZED_FILTER_TYPES = [
    'text',
    'numeric',
    'color',
    'date',
    'datetime-local',
    'datetime',
    'time',
    'decimal',
    'dropdown',
    'tagbox',
    'boolean'
];

const DEFAULT_FIELDS_NAMES = [
    'id',
    'createdAt',
    'modifiedAt'
];

const DEFAULT_FIELDS = [
    {
        name: 'id',
        type: 'text'
    },
    {
        name: 'createdAt',
        type: 'date'
    },
    {
        name: 'modifiedAt',
        type: 'date'
    }
];

const getkey = (key: string) => {
    return DEFAULT_FIELDS_NAMES.includes(key) ? key : `data.${key}`;
}

function getFilters(filters: any, fields: any[]) {

    const expandedFields = fields.concat(DEFAULT_FIELDS);

    if (!filters) {
        return {};
    }

    const mongooseFilters = {};

    for (const filter of filters) {
        if (!!filter.value && ((typeof filter.value === 'object' && filter.value.length > 0) ||
            (typeof filter.value === 'string' && filter.value.trim().length > 0))) {
            let value = filter.value;
            const field = expandedFields.find( x => x.name === filter.field);
            if (field && AUTHORIZED_FILTER_TYPES.includes(field.type)) {
                switch (field.type) {
                    case 'date':
                        value = new Date(value);
                        break;
                    case 'datetime':
                        value = new Date(value);
                        break;
                    case 'datetime-local':
                        value = new Date(value);
                        break;
                    case 'time': {
                        value = new Date(value);
                        const hours = value.slice(0, 2);
                        const minutes = value.slice(3);
                        value = new Date(Date.UTC(1970, 0, 1, hours, minutes));
                        break;
                    }
                    default:
                        break;
                }
                switch (filter.operator) {
                    case 'contains':
                        if (field.type === 'tagbox' || typeof value === 'object') {
                            mongooseFilters[getkey(filter.field)] = {$in: value}
                        } else {
                            mongooseFilters[getkey(filter.field)] = {$regex: String(value), $options: 'i'};
                        }
                        break;
                    case '=':
                        if (field.type === 'tagbox' || typeof value === 'object') {
                            mongooseFilters[getkey(filter.field)] = { $in: value }
                        } else {
                            mongooseFilters[getkey(filter.field)] = { $eq: value };
                        }
                        break;
                    case '!=':
                        if (field.type === 'tagbox' || typeof value === 'object') {
                            mongooseFilters[getkey(filter.field)] = { $nin: value }
                        } else {
                            mongooseFilters[getkey(filter.field)] = { $eq: value };
                        }
                        break;
                    case '>':
                        mongooseFilters[getkey(filter.field)] = { $gt: value };
                        break;
                    case '>=':
                        mongooseFilters[getkey(filter.field)] = { $gte: value };
                        break;
                    case '<':
                        mongooseFilters[getkey(filter.field)] = { $lt: value };
                        break;
                    case '<=':
                        mongooseFilters[getkey(filter.field)] = { $lte: value };
                        break;
                    default:
                        break;
                }
            }
        }
    }
    return mongooseFilters;
}

export default getFilters;
