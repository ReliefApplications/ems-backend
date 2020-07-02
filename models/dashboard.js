const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dashboardSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed,
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    }
});

module.exports = mongoose.model('Dashboard', dashboardSchema);