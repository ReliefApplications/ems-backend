const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workflowSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    steps: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Step'
    },
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

module.exports = mongoose.model('Workflow', workflowSchema);