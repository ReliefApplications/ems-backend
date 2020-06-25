const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recordSchema = new Schema({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        required: false
    },
    createdAt: Date,
    modifiedAt: Date,
    deleted: {
        type: Boolean,
        default: false
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
});

module.exports = mongoose.model('Record', recordSchema);