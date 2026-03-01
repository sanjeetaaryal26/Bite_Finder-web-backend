"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabaseTest = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDatabaseTest = async () => {
    const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
    if (!uri) {
        throw new Error("MONGO_URI_TEST or MONGO_URI must be set for tests");
    }
    await mongoose_1.default.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
    });
};
exports.connectDatabaseTest = connectDatabaseTest;
//# sourceMappingURL=mongodb.js.map