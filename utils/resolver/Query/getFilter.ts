import mongoose from 'mongoose';

export default (filter: any) => {
    const mongooseFilter = {};
    console.log(filter);
    if (filter.ids) {
        Object.assign(mongooseFilter,
            { _id: { $in: filter.ids.map(x => mongoose.Types.ObjectId(x)) } }
        )
    }
    return mongooseFilter;
}