// @ts-nocheck
const originalEnv = { ...process.env };

describe("Backend unit tests", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateToken", () => {
    it("generateAccessToken calls jwt.sign with access secret", () => {
      const sign = jest.fn(() => "access-token");
      jest.doMock("jsonwebtoken", () => ({ sign }));
      process.env.JWT_ACCESS_SECRET = "access-secret";

      const { generateAccessToken } = require("../../utils/generateToken");
      const payload = { id: "u1", role: "user" };
      generateAccessToken(payload);

      expect(sign).toHaveBeenCalledWith(payload, "access-secret", { expiresIn: "15m" });
    });

    it("generateAccessToken honors ACCESS_TOKEN_EXPIRES_IN", () => {
      const sign = jest.fn(() => "access-token");
      jest.doMock("jsonwebtoken", () => ({ sign }));
      process.env.JWT_ACCESS_SECRET = "access-secret";
      process.env.ACCESS_TOKEN_EXPIRES_IN = "30m";

      const { generateAccessToken } = require("../../utils/generateToken");
      generateAccessToken({ id: "u1" });

      expect(sign).toHaveBeenCalledWith({ id: "u1" }, "access-secret", { expiresIn: "30m" });
    });

    it("generateAccessToken returns token from jwt.sign", () => {
      jest.doMock("jsonwebtoken", () => ({ sign: jest.fn(() => "abc") }));
      process.env.JWT_ACCESS_SECRET = "access-secret";

      const { generateAccessToken } = require("../../utils/generateToken");
      expect(generateAccessToken({ id: "u1" })).toBe("abc");
    });

    it("generateRefreshToken calls jwt.sign with refresh secret", () => {
      const sign = jest.fn(() => "refresh-token");
      jest.doMock("jsonwebtoken", () => ({ sign }));
      process.env.JWT_REFRESH_SECRET = "refresh-secret";

      const { generateRefreshToken } = require("../../utils/generateToken");
      const payload = { id: "u1", role: "user" };
      generateRefreshToken(payload);

      expect(sign).toHaveBeenCalledWith(payload, "refresh-secret", { expiresIn: "7d" });
    });

    it("generateRefreshToken honors REFRESH_TOKEN_EXPIRES_IN", () => {
      const sign = jest.fn(() => "refresh-token");
      jest.doMock("jsonwebtoken", () => ({ sign }));
      process.env.JWT_REFRESH_SECRET = "refresh-secret";
      process.env.REFRESH_TOKEN_EXPIRES_IN = "14d";

      const { generateRefreshToken } = require("../../utils/generateToken");
      generateRefreshToken({ id: "u1" });

      expect(sign).toHaveBeenCalledWith({ id: "u1" }, "refresh-secret", { expiresIn: "14d" });
    });

    it("generateRefreshToken returns token from jwt.sign", () => {
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

    it("protect returns 401 when authorization header is missing", () => {
      const verify = jest.fn();
      jest.doMock("jsonwebtoken", () => ({ verify }));
      const middleware = require("../../middleware/authMiddleware");
      const req: any = { headers: {} };
      const res = resFactory();
      const next = jest.fn();

      middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("protect returns 401 when token is invalid", () => {
      const verify = jest.fn(() => {
        throw new Error("invalid");
      });
      jest.doMock("jsonwebtoken", () => ({ verify }));
      const middleware = require("../../middleware/authMiddleware");
      const req: any = { headers: { authorization: "Bearer bad-token" } };
      const res = resFactory();
      const next = jest.fn();

      middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("protect sets req.user and calls next for valid token", () => {
      const verify = jest.fn(() => ({ id: "u1", role: "admin" }));
      jest.doMock("jsonwebtoken", () => ({ verify }));
      process.env.JWT_ACCESS_SECRET = "secret";

      const middleware = require("../../middleware/authMiddleware");
      const req: any = { headers: { authorization: "Bearer good-token" } };
      const res = resFactory();
      const next = jest.fn();

      middleware.protect(req, res, next);

      expect(req.user).toEqual({ id: "u1", role: "admin" });
      expect(next).toHaveBeenCalled();
    });

    it("protect ignores malformed Bearer header", () => {
      const verify = jest.fn();
      jest.doMock("jsonwebtoken", () => ({ verify }));
      const middleware = require("../../middleware/authMiddleware");
      const req: any = { headers: { authorization: "Token abc" } };
      const res = resFactory();
      const next = jest.fn();

      middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("protect verifies token using JWT_ACCESS_SECRET", () => {
      const verify = jest.fn(() => ({ id: "u1", role: "user" }));
      jest.doMock("jsonwebtoken", () => ({ verify }));
      process.env.JWT_ACCESS_SECRET = "my-secret";

      const middleware = require("../../middleware/authMiddleware");
      const req: any = { headers: { authorization: "Bearer abc" } };
      const res = resFactory();

      middleware.protect(req, res, jest.fn());

      expect(verify).toHaveBeenCalledWith("abc", "my-secret");
    });

    it("authorize returns 401 when req.user is missing", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const { authorize } = require("../../middleware/authMiddleware");
      const req: any = {};
      const res = resFactory();

      authorize("admin")(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("authorize returns 403 when role is not allowed", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const { authorize } = require("../../middleware/authMiddleware");
      const req: any = { user: { role: "user" } };
      const res = resFactory();

      authorize("admin")(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("authorize allows matching role", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const { authorize } = require("../../middleware/authMiddleware");
      const req: any = { user: { role: "admin" } };
      const res = resFactory();
      const next = jest.fn();

      authorize("admin")(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("authorize supports array roles", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const { authorize } = require("../../middleware/authMiddleware");
      const req: any = { user: { role: "owner" } };
      const res = resFactory();
      const next = jest.fn();

      authorize(["admin", "owner"])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("requireAdmin blocks non-admin users", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const { requireAdmin } = require("../../middleware/authMiddleware");
      const req: any = { user: { role: "user" } };
      const res = resFactory();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("requireAdmin allows admin users", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const { requireAdmin } = require("../../middleware/authMiddleware");
      const req: any = { user: { role: "admin" } };
      const res = resFactory();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("authMiddleware alias matches protect", () => {
      jest.doMock("jsonwebtoken", () => ({ verify: jest.fn() }));
      const middleware = require("../../middleware/authMiddleware");

      expect(middleware.authMiddleware).toBe(middleware.protect);
    });
  });

  describe("mailer", () => {
    it("sendEmail uses SMTP transporter when SMTP vars exist", async () => {
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

    it("sendEmail uses Gmail fallback when SMTP is absent", async () => {
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

    it("sendEmail throws when sender is missing", async () => {
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

      await expect(sendEmail({ to: "to@example.com", subject: "Sub", html: "<p>Hi</p>", text: "Hi" })).rejects.toThrow(
        "Missing sender email"
      );
    });

    it("sendEmail throws when transport config is missing", async () => {
      jest.doMock("nodemailer", () => ({ createTransport: jest.fn() }));
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      const { sendEmail } = require("../../utils/mailer");

      await expect(sendEmail({ to: "to@example.com", subject: "Sub", html: "<p>Hi</p>", text: "Hi" })).rejects.toThrow(
        "Missing mail configuration"
      );
    });
  });
});
