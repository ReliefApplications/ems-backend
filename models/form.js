const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const formSchema = new Schema({
    name: String,
    createdAt: Date,
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
    }
});

module.exports = mongoose.model('Form', formSchema);