"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_1 = require("../database/mongodb");
beforeAll(async () => {
    await (0, mongodb_1.connectDatabaseTest)();
});
afterAll(async () => {
    await mongoose_1.default.connection.close();
});
//# sourceMappingURL=setup.js.map