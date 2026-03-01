"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const supertest_1 = __importDefault(require("supertest"));
const mockRoutes = () => {
    jest.doMock("../../routes/authRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/restaurantRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/reviewRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/uploadRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/favoriteRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/foodFavoriteRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/recommendationRoutes", () => {
        const express = require("express");
        return express.Router();
    });
    jest.doMock("../../routes/adminRoutes", () => {
        const express = require("express");
        return express.Router();
    });
};
describe("Backend integration tests", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        mockRoutes();
    });
    it("GET /health returns 200 and OK message", async () => {
        const app = require("../../app");
        const res = await (0, supertest_1.default)(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, message: "OK" });
    });
    it("unknown route returns 404", async () => {
        const app = require("../../app");
        const res = await (0, supertest_1.default)(app).get("/not-found");
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
    it("app exports an express app function", () => {
        const app = require("../../app");
        expect(typeof app).toBe("function");
    });
    it("CORS preflight responds successfully on /health", async () => {
        const app = require("../../app");
        const res = await (0, supertest_1.default)(app)
            .options("/health")
            .set("Origin", "http://localhost:3000")
            .set("Access-Control-Request-Method", "GET");
        expect(res.status).toBeLessThan(500);
    });
});
//# sourceMappingURL=app.integration.test.js.map