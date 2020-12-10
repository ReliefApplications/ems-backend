import mongoose from 'mongoose';

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
                    if (mongooseFilter[`data.${shortKey}`]) {
                        Object.assign(mongooseFilter[`data.${shortKey}`], { $lte: filter[key] })
                    } else {
                        mongooseFilter[`data.${shortKey}`] = { $lte: filter[key] };
                    }
                    break;
                }
                case (key.indexOf('_gte') !== -1): {
                    const shortKey = key.substr(0, key.length - 4)
                    if (mongooseFilter[`data.${shortKey}`]) {
                        Object.assign(mongooseFilter[`data.${shortKey}`], { $gte: filter[key] })
                    } else {
                        mongooseFilter[`data.${shortKey}`] = { $gte: filter[key] };
                    }
                    break;
                }
                case (key.indexOf('_lt') !== -1): {
                    const shortKey = key.substr(0, key.length - 3)
                    if (mongooseFilter[`data.${shortKey}`]) {
                        Object.assign(mongooseFilter[`data.${shortKey}`], { $lt: filter[key] })
                    } else {
                        mongooseFilter[`data.${shortKey}`] = { $lt: filter[key] };
                    }
                    break;
                }
                case (key.indexOf('_gt') !== -1): {
                    const shortKey = key.substr(0, key.length - 3)
                    if (mongooseFilter[`data.${shortKey}`]) {
                        Object.assign(mongooseFilter[`data.${shortKey}`], { $gt: filter[key] })
                    } else {
                        mongooseFilter[`data.${shortKey}`] = { $gt: filter[key] };
                    }
                    break;
                }
                default:
                    mongooseFilter[`data.${key}`] = filter[key];
                    break;
            }
        })
    return mongooseFilter;
}