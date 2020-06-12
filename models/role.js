const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
    title: String
});

module.exports = mongoose.model('Role', roleSchema);