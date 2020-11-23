const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
    title: String,
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    },
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    }  
});

<<<<<<< Updated upstream
roleSchema.index({title: 1, application: 1}, {unique: true});
=======
roleSchema.index({"title": 1, "application": 1},
                 {unique: true}
                 );
>>>>>>> Stashed changes

module.exports = mongoose.model('Role', roleSchema);