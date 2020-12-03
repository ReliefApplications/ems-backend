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
const recordSchema = new mongoose_1.Schema({
    form: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    resource: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Resource',
        required: false
    },
    createdAt: Date,
    modifiedAt: Date,
    deleted: {
        type: Boolean,
        default: false
    },
    data: {
        type: mongoose_1.default.Schema.Types.Mixed,
        required: true
    }
});
exports.default = mongoose_1.default.model('Record', recordSchema);
//# sourceMappingURL=record.js.map