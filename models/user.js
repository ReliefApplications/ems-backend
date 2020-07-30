const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    name: String,
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    oid: String
});

userSchema.index({oid: 1}, {unique: true});

module.exports = mongoose.model('User', userSchema);