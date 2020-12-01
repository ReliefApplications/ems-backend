const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workflowSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    steps: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Step'
    }
});

module.exports = mongoose.model('Workflow', workflowSchema);