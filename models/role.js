const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
    title: String,
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    }
});

roleSchema.index({title: 1}, {unique: true});

module.exports = mongoose.model('Role', roleSchema);