const mongoose = require('mongoose');
const Record = require('../models/record');
const Schema = mongoose.Schema;

const formSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed,
    status: {
        type: String,
        enum: ['active', 'pending', 'archived']
    },
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource'
    },
    versions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Version'
    }
});

module.exports = mongoose.model('Form', formSchema);