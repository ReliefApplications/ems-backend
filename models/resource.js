const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resourceSchema = new Schema({
    name: String,
    createdAt: Date,
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    fields: {
        // name of field, id if external resource
        type: [mongoose.Schema.Types.Mixed]
    }
});

module.exports = mongoose.model('Resource', resourceSchema);