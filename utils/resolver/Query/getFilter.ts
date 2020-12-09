import mongoose from 'mongoose';

export default (filter: any) => {
    const mongooseFilter = {};
    console.log(filter);
    if (filter.ids) {
        Object.assign(mongooseFilter,
            { _id: { $in: filter.ids.map(x => mongoose.Types.ObjectId(x)) } }
        )
    }
    Object.keys(filter)
        .filter((key) => key !== 'ids')
        .forEach((key) => {
            mongooseFilter[`data.${key}`] = filter[key];
        })
    return mongooseFilter;
}