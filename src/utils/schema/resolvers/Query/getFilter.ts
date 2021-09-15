import mongoose from 'mongoose';
import { defaultRecordFieldsFlat } from '../../../../const/defaultRecordFields';

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

const getSchemaKey = (key) => {
    return defaultRecordFieldsFlat.includes(key) ? ( key === 'id' ? '_id' : key ) : `data.${key}`;
}

export default (filter: any, fields: any[]) => {
    const mongooseFilter = {};

    const expandedFields = fields.concat(DEFAULT_FIELDS);

    if (filter.ids) {
        Object.assign(mongooseFilter,
            { _id: { $in: filter.ids.map(x => mongoose.Types.ObjectId(x)) } }
        )
    }
    Object.keys(filter)
        .filter((key) => key !== 'ids')
        .forEach((key) => {
            switch(true) {
                case (key.indexOf('_lte') !== -1): {
                    const shortKey = key.substr(0, key.length - 4);
                    const field = expandedFields.find(x => x.name === shortKey);
                    let value = filter[key];
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
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $lte: value })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $lte: value };
                    }
                    break;
                }
                case (key.indexOf('_gte') !== -1): {
                    const shortKey = key.substr(0, key.length - 4);
                    const field = expandedFields.find(x => x.name === shortKey);
                    let value = filter[key];
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
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $gte: value })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $gte: value };
                    }
                    break;
                }
                case (key.indexOf('_lt') !== -1): {
                    const shortKey = key.substr(0, key.length - 4);
                    const field = expandedFields.find(x => x.name === shortKey);
                    let value = filter[key];
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
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $lt: value })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $lt: value };
                    }
                    break;
                }
                case (key.indexOf('_gt') !== -1): {
                    const shortKey = key.substr(0, key.length - 4);
                    const field = expandedFields.find(x => x.name === shortKey);
                    let value = filter[key];
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
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $gt: value })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $gt: value };
                    }
                    break;
                }
                default:
                    mongooseFilter[getSchemaKey(key)] = filter[key];
                    break;
            }
        })
    return mongooseFilter;
}
