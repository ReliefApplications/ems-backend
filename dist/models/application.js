"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const applicationSchema = new mongoose_1.Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    status: {
        type: String,
        enum: ['active', 'pending', 'archived']
    },
    createdBy: {
        type: [mongoose_1.default.Schema.Types.ObjectId],
        ref: 'User'
    },
    pages: {
        // id of pages linked to this application
        type: [mongoose_1.default.Schema.Types.ObjectId],
        ref: 'Page'
    },
    settings: mongoose_1.default.Schema.Types.Mixed,
    description: String,
    permissions: {
        canSee: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'Role'
            }],
        canCreate: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'Role'
            }],
        canUpdate: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'Role'
            }],
        canDelete: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'Role'
            }]
    }
});
exports.default = mongoose_1.default.model('Application', applicationSchema);
//# sourceMappingURL=application.js.map