"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const supertest_1 = __importDefault(require("supertest"));
const originalEnv = { ...process.env };
describe("Backend test suite (26 tests)", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    describe("generateToken", () => {
        it("1. generateAccessToken calls jwt.sign with access secret", () => {
            const sign = jest.fn(() => "access-token");
            jest.doMock("jsonwebtoken", () => ({ sign }));
            process.env.JWT_ACCESS_SECRET = "access-secret";
            const { generateAccessToken } = require("../../utils/generateToken");
            const payload = { id: "u1", role: "user" };
            generateAccessToken(payload);
            expect(sign).toHaveBeenCalledWith(payload, "access-secret", { expiresIn: "15m" });
        });
        it("2. generateAccessToken honors ACCESS_TOKEN_EXPIRES_IN", () => {
            const sign = jest.fn(() => "access-token");
            jest.doMock("jsonwebtoken", () => ({ sign }));
            process.env.JWT_ACCESS_SECRET = "access-secret";
            process.env.ACCESS_TOKEN_EXPIRES_IN = "30m";
            const { generateAccessToken } = require("../../utils/generateToken");
            generateAccessToken({ id: "u1" });
            expect(sign).toHaveBeenCalledWith({ id: "u1" }, "access-secret", { expiresIn: "30m" });
        });
        it("3. generateAccessToken returns token from jwt.sign", () => {
            jest.doMock("jsonwebtoken", () => ({ sign: jest.fn(() => "abc") }));
            process.env.JWT_ACCESS_SECRET = "access-secret";
            const { generateAccessToken } = require("../../utils/generateToken");
            expect(generateAccessToken({ id: "u1" })).toBe("abc");
        });
        it("4. generateRefreshToken calls jwt.sign with refresh secret", () => {
            const sign = jest.fn(() => "refresh-token");
            jest.doMock("jsonwebtoken", () => ({ sign }));
            process.env.JWT_REFRESH_SECRET = "refresh-secret";
            const { generateRefreshToken } = require("../../utils/generateToken");
            const payload = { id: "u1", role: "user" };
            generateRefreshToken(payload);
            expect(sign).toHaveBeenCalledWith(payload, "refresh-secret", { expiresIn: "7d" });
        });
        it("5. generateRefreshToken honors REFRESH_TOKEN_EXPIRES_IN", () => {
            const sign = jest.fn(() => "refresh-token");
            jest.doMock("jsonwebtoken", () => ({ sign }));
            process.env.JWT_REFRESH_SECRET = "refresh-secret";
            process.env.REFRESH_TOKEN_EXPIRES_IN = "14d";
            const { generateRefreshToken } = require("../../utils/generateToken");
            generateRefreshToken({ id: "u1" });
            expect(sign).toHaveBeenCalledWith({ id: "u1" }, "refresh-secret", { expiresIn: "14d" });
        });
        it("6. generateRefreshToken returns token from jwt.sign", () => {
            jest.doMock("jsonwebtoken", () => ({ sign: jest.fn(() => "def") }));
            process.env.JWT_REFRESH_SECRET = "refresh-secret";
            const { generateRefreshToken } = require("../../utils/generateToken");
            expect(generateRefreshToken({ id: "u1" })).toBe("def");
        });
    });
    describe("authMiddleware", () => {
        function resFactory() {
            return {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
        }
        it("7. protect returns 401 when authorization header is missing", () => {
            const verify = jest.fn();
            jest.doMock("jsonwebtoken", () => ({ verify }));
            const middleware = require("../../middleware/authMiddleware");
            const req = { headers: {} };
            const res = resFactory();
            const next = jest.fn();
            middleware.protect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        it("8. protect returns 401 when token is invalid", () => {
            const verify = jest.fn(() => {
                throw new Error("invalid");
            });
            jest.doMock("jsonwebtoken", () => ({ verify }));
            const middleware = require("../../middleware/authMiddleware");
            const req = { headers: { authorization: "Bearer bad-token" } };
            const res = resFactory();
            const next = jest.fn();
            middleware.protect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        it("9. protect sets req.user and calls next for valid token", () => {
            const verify = jest.fn(() => ({ id: "u1", role: "admin" }));
            jest.doMock("jsonwebtoken", () => ({ verify }));
            process.env.JWT_ACCESS_SECRET = "secret";
            const middleware = require("../../middleware/authMiddleware");
            const req = { headers: { authorization: "Bearer good-token" } };
            const res = resFactory();
            const next = jest.fn();
            middleware.protect(req, res, next);
            expect(req.user).toEqual({ id: "u1", role: "admin" });
            expect(next).toHaveBeenCalled();
        });
        it("10. protect ignores malformed Bearer header", () => {
            const verify = jest.fn();
            jest.doMock("jsonwebtoken", () => ({ verify }));
            const middleware = require("../../middleware/authMiddleware");
            const req = { headers: { authorization: "Token abc" } };
            const res = resFactory();
            const next = jest.fn();
            middleware.protect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(verify).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
        it("11. protect verifies token using JWT_ACCESS_SECRET", () => {
            const verify = jest.fn(() => ({ id: "u1", role: "user" }));
            jest.doMock("jsonwebtoken", () => ({ verify }));
            process.env.JWT_ACCESS_SECRET = "my-secret";
            const middleware = require("../../middleware/authMiddleware");
            const req = { headers: { authorization: "Bearer abc" } };
            const res = resFactory();
            middleware.protect(req, res, jest.fn());
            expect(verify).toHaveBeenCalledWith("abc", "my-secret");
        });
        it("12. authorize returns 401 when req.user is missing", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const { authorize } = require("../../middleware/authMiddleware");
            const req = {};
            const res = resFactory();
            authorize("admin")(req, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });
        it("13. authorize returns 403 when role is not allowed", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const { authorize } = require("../../middleware/authMiddleware");
            const req = { user: { role: "user" } };
            const res = resFactory();
            authorize("admin")(req, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
        it("14. authorize allows matching role", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const { authorize } = require("../../middleware/authMiddleware");
            const req = { user: { role: "admin" } };
            const res = resFactory();
            const next = jest.fn();
            authorize("admin")(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it("15. authorize supports array roles", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const { authorize } = require("../../middleware/authMiddleware");
            const req = { user: { role: "owner" } };
            const res = resFactory();
            const next = jest.fn();
            authorize(["admin", "owner"])(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it("16. requireAdmin blocks non-admin users", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const { requireAdmin } = require("../../middleware/authMiddleware");
            const req = { user: { role: "user" } };
            const res = resFactory();
            const next = jest.fn();
            requireAdmin(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
        it("17. requireAdmin allows admin users", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const { requireAdmin } = require("../../middleware/authMiddleware");
            const req = { user: { role: "admin" } };
            const res = resFactory();
            const next = jest.fn();
            requireAdmin(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it("18. authMiddleware alias matches protect", () => {
            jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
            const middleware = require("../../middleware/authMiddleware");
            expect(middleware.authMiddleware).toBe(middleware.protect);
        });
    });
    describe("mailer", () => {
        it("19. sendEmail uses SMTP transporter when SMTP vars exist", async () => {
            const sendMail = jest.fn().mockResolvedValue({});
            const createTransport = jest.fn(() => ({ sendMail }));
            jest.doMock("nodemailer", () => ({ createTransport }));
            process.env.SMTP_HOST = "smtp.example.com";
            process.env.SMTP_PORT = "587";
            process.env.SMTP_USER = "smtp-user";
            process.env.SMTP_PASS = "smtp-pass";
            process.env.SMTP_FROM = "from@example.com";
            const { sendEmail } = require("../../utils/mailer");
            await sendEmail({ to: "to@example.com", subject: "Sub", html: "<p>Hi</p>", text: "Hi" });
            expect(createTransport).toHaveBeenCalled();
            expect(sendMail).toHaveBeenCalled();
        });
        it("20. sendEmail uses Gmail fallback when SMTP is absent", async () => {
            const sendMail = jest.fn().mockResolvedValue({});
            const createTransport = jest.fn(() => ({ sendMail }));
            jest.doMock("nodemailer", () => ({ createTransport }));
            process.env.EMAIL_USER = "gmail@example.com";
            process.env.EMAIL_PASS = "app-pass";
            const { sendEmail } = require("../../utils/mailer");
            await sendEmail({ to: "to@example.com", subject: "Sub", html: "<p>Hi</p>", text: "Hi" });
            expect(createTransport).toHaveBeenCalledWith({
                service: "gmail",
                auth: { user: "gmail@example.com", pass: "app-pass" },
            });
        });
        it("21. sendEmail throws when sender is missing", async () => {
            const sendMail = jest.fn().mockResolvedValue({});
            const createTransport = jest.fn(() => ({ sendMail }));
            jest.doMock("nodemailer", () => ({ createTransport }));
            process.env.SMTP_HOST = "smtp.example.com";
            process.env.SMTP_PORT = "587";
            process.env.SMTP_USER = "smtp-user";
            process.env.SMTP_PASS = "smtp-pass";
            delete process.env.SMTP_FROM;
            delete process.env.EMAIL_FROM;
            delete process.env.EMAIL_USER;
            const { sendEmail } = require("../../utils/mailer");
            await expect(sendEmail({ to: "to@example.com", subject: "Sub", html: "<p>Hi</p>", text: "Hi" })).rejects.toThrow("Missing sender email");
        });
        it("22. sendEmail throws when transport config is missing", async () => {
            jest.doMock("nodemailer", () => ({ createTransport: jest.fn() }));
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_PORT;
            delete process.env.SMTP_USER;
            delete process.env.SMTP_PASS;
            delete process.env.EMAIL_USER;
            delete process.env.EMAIL_PASS;
            const { sendEmail } = require("../../utils/mailer");
            await expect(sendEmail({ to: "to@example.com", subject: "Sub", html: "<p>Hi</p>", text: "Hi" })).rejects.toThrow("Missing mail configuration");
        });
    });
    describe("app routes", () => {
        it("23. GET /health returns 200 and OK message", async () => {
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
            const app = require("../../app");
            const res = await (0, supertest_1.default)(app).get("/health");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: "OK" });
        });
        it("24. unknown route returns 404", async () => {
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
            const app = require("../../app");
            const res = await (0, supertest_1.default)(app).get("/not-found");
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
        it("25. app exports an express app function", () => {
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
            const app = require("../../app");
            expect(typeof app).toBe("function");
        });
        it("26. CORS preflight responds successfully on /health", async () => {
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
            const app = require("../../app");
            const res = await (0, supertest_1.default)(app)
                .options("/health")
                .set("Origin", "http://localhost:3000")
                .set("Access-Control-Request-Method", "GET");
            expect(res.status).toBeLessThan(500);
        });
    });
});
//# sourceMappingURL=backend-26.test.js.map