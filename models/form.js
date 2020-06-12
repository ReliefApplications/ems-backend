const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const formSchema = new Schema({
    name: String,
    createdAt: Date,
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        required: true
    }
});

module.exports = mongoose.model('Form', formSchema);