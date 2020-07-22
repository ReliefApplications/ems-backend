const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dashboardSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed,
    permissions: {
        canSee: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canCreate: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canUpdate: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canDelete: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }]
    }
});

module.exports = mongoose.model('Dashboard', dashboardSchema);