const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const permissionSchema = new Schema({
    type: {
        type: String,
        // enum: [
        //     'can_create',
        //     'can_view',
        //     'can_update',
        //     'can_delete',
        //     'can_create_own',
        //     'can_read_own',
        //     'can_update_own',
        //     'can_delete_own'
        // ],
        required: true
    }
});

permissionSchema.index({type: 1}, {unique: true});

module.exports = mongoose.model('Permission', permissionSchema);