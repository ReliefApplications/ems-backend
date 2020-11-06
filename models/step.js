const mongoose = require('mongoose');
const contentType = require('../const/contentType');
const Schema = mongoose.Schema;

const stepSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    type: {
        type: String,
        enum: [contentType.dashboard, contentType.form]
    },
    
    // Can be either a dashboard or a form ID
    content: mongoose.Schema.Types.ObjectId,

    permissions: {
        canSee: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canCreate: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canUpdate: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canDelete: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }]
    }
});

module.exports = mongoose.model('Step', stepSchema);