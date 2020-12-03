const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const permissionSchema = new Schema({
    type: {
        type: String,
        required: true
    },
    global: Boolean
});

permissionSchema.index({type: 1, global: 1}, {unique: true});

module.exports = mongoose.model('Permission', permissionSchema);