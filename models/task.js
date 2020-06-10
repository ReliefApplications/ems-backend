const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const taskSchema = new Schema({
    incidentID: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    countryID: String,
    createdAt: Date
});

module.exports = mongoose.model('Task', taskSchema);