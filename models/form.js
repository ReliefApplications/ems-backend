const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const formSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed,
    core: Boolean,
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

formSchema.index({ resource: 1, core: 1 }, { unique: true, sparse: true});

module.exports = mongoose.model('Form', formSchema);