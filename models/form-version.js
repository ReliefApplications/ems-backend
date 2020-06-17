const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const formVersionSchema = new Schema({
    createdAt: Date,
    structure: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('FormVersion', formVersionSchema);