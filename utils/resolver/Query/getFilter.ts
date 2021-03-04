import mongoose from 'mongoose';
import { defaultFields } from '../../../const/defaultRecordFields';

const getSchemaKey = (key) => {
    return defaultFields.includes(key) ? ( key === 'id' ? '_id' : key ) : `data.${key}`;
}

export default (filter: any) => {
    const mongooseFilter = {};

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
                    const shortKey = key.substr(0, key.length - 4)
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $lte: filter[key] })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $lte: filter[key] };
                    }
                    break;
                }
                case (key.indexOf('_gte') !== -1): {
                    const shortKey = key.substr(0, key.length - 4)
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $gte: filter[key] })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $gte: filter[key] };
                    }
                    break;
                }
                case (key.indexOf('_lt') !== -1): {
                    const shortKey = key.substr(0, key.length - 3)
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $lt: filter[key] })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $lt: filter[key] };
                    }
                    break;
                }
                case (key.indexOf('_gt') !== -1): {
                    const shortKey = key.substr(0, key.length - 3)
                    if (mongooseFilter[getSchemaKey(shortKey)]) {
                        Object.assign(mongooseFilter[getSchemaKey(shortKey)], { $gt: filter[key] })
                    } else {
                        mongooseFilter[getSchemaKey(shortKey)] = { $gt: filter[key] };
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