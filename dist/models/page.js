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
const contentType_1 = require("../const/contentType");
const pageSchema = new mongoose_1.Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    type: {
        type: String,
        enum: [contentType_1.contentType.workflow, contentType_1.contentType.dashboard, contentType_1.contentType.form]
    },
    // Can be either a workflow, a dashboard or a form ID
    content: mongoose_1.default.Schema.Types.ObjectId,
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
exports.default = mongoose_1.default.model('Page', pageSchema);
//# sourceMappingURL=page.js.map