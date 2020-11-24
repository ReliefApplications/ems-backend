const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
    title: String,
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    },
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    }  
});

roleSchema.index({title: 1, application: 1}, {unique: true});

module.exports = mongoose.model('Role', roleSchema);