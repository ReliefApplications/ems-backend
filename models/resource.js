const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resourceSchema = new Schema({
    name: String,
    createdAt: Date,
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }]
});

module.exports = mongoose.model('Resource', resourceSchema);