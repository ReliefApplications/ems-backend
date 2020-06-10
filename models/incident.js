const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const incidentSchema = new Schema({
    name: String,
    createdAt: Date
});

module.exports = mongoose.model('Incident', incidentSchema);