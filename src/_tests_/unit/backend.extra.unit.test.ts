// @ts-nocheck

describe("Backend additional unit tests (26)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("config/db", () => {
    it("calls mongoose.connect with MONGO_URI", async () => {
      const connect = jest.fn().mockResolvedValue({ connection: { host: "localhost" } });
      jest.doMock("mongoose", () => ({ connect }));
      process.env.MONGO_URI = "mongodb://localhost:27017/test";

      const connectDB = require("../../config/db");
      await connectDB();

      expect(connect).toHaveBeenCalledWith("mongodb://localhost:27017/test");
    });

    it("logs host on successful connection", async () => {
      const connect = jest.fn().mockResolvedValue({ connection: { host: "mongo-host" } });
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      jest.doMock("mongoose", () => ({ connect }));
      process.env.MONGO_URI = "mongodb://localhost:27017/test";

      const connectDB = require("../../config/db");
      await connectDB();

      expect(logSpy).toHaveBeenCalledWith("MongoDB connected: mongo-host");
      logSpy.mockRestore();
    });

    it("logs error and exits when connection fails", async () => {
      const connect = jest.fn().mockRejectedValue({ message: "boom" });
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
      jest.doMock("mongoose", () => ({ connect }));

      const connectDB = require("../../config/db");
      await connectDB();

      expect(errSpy).toHaveBeenCalledWith("MongoDB connection error:", "boom");
      expect(exitSpy).toHaveBeenCalledWith(1);
      errSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it("exports a function", () => {
      jest.doMock("mongoose", () => ({ connect: jest.fn() }));
      const connectDB = require("../../config/db");
      expect(typeof connectDB).toBe("function");
    });
  });

  describe("config/s3", () => {
    it("constructs S3Client with env credentials", () => {
      const S3Client = jest.fn().mockImplementation((args) => ({ args }));
      jest.doMock("@aws-sdk/client-s3", () => ({ S3Client }));
      process.env.AWS_REGION = "ap-south-1";
      process.env.AWS_ACCESS_KEY_ID = "AKIA_TEST";
      process.env.AWS_SECRET_ACCESS_KEY = "SECRET_TEST";

      const mod = require("../../config/s3");

      expect(S3Client).toHaveBeenCalledWith({
        region: "ap-south-1",
        credentials: {
          accessKeyId: "AKIA_TEST",
          secretAccessKey: "SECRET_TEST",
        },
      });
      expect(mod.s3Client).toBeDefined();
    });

    it("exports object with s3Client key", () => {
      const S3Client = jest.fn().mockImplementation(() => ({}));
      jest.doMock("@aws-sdk/client-s3", () => ({ S3Client }));

      const mod = require("../../config/s3");
      expect(Object.prototype.hasOwnProperty.call(mod, "s3Client")).toBe(true);
    });

    it("instantiates S3Client once on module load", () => {
      const S3Client = jest.fn().mockImplementation(() => ({}));
      jest.doMock("@aws-sdk/client-s3", () => ({ S3Client }));

      require("../../config/s3");

      expect(S3Client).toHaveBeenCalledTimes(1);
    });
  });

  describe("config/cloudinary", () => {
    it("calls cloudinary.config with env values", () => {
      const config = jest.fn();
      const v2 = { config };
      jest.doMock("cloudinary", () => ({ v2 }));
      process.env.CLOUDINARY_CLOUD_NAME = "cloud";
      process.env.CLOUDINARY_API_KEY = "key";
      process.env.CLOUDINARY_API_SECRET = "secret";

      require("../../config/cloudinary");

      expect(config).toHaveBeenCalledWith({
        cloud_name: "cloud",
        api_key: "key",
        api_secret: "secret",
      });
    });

    it("exports cloudinary v2 object", () => {
      const v2 = { config: jest.fn(), uploader: {} };
      jest.doMock("cloudinary", () => ({ v2 }));

      const mod = require("../../config/cloudinary");
      expect(mod).toBe(v2);
    });

    it("config is called exactly once", () => {
      const config = jest.fn();
      jest.doMock("cloudinary", () => ({ v2: { config } }));

      require("../../config/cloudinary");

      expect(config).toHaveBeenCalledTimes(1);
    });
  });

  describe("server startup", () => {
    it("calls dotenv.config on import", () => {
      const config = jest.fn();
      jest.doMock("dotenv", () => ({ config }));
      jest.doMock("http", () => ({ createServer: jest.fn(() => ({ listen: jest.fn() })) }));
      jest.doMock("../../app", () => ({}));
      jest.doMock("../../database/db", () => jest.fn().mockResolvedValue(undefined));

      jest.isolateModules(() => {
        require("../../server");
      });

      expect(config).toHaveBeenCalled();
    });

    it("connects to DB before starting server", async () => {
      const connectDB = jest.fn().mockResolvedValue(undefined);
      const listen = jest.fn((_, cb) => cb && cb());
      jest.doMock("dotenv", () => ({ config: jest.fn() }));
      jest.doMock("http", () => ({ createServer: jest.fn(() => ({ listen })) }));
      jest.doMock("../../app", () => ({}));
      jest.doMock("../../database/db", () => connectDB);

      jest.isolateModules(() => {
        require("../../server");
      });

      await Promise.resolve();
      expect(connectDB).toHaveBeenCalled();
    });

    it("creates http server with app", async () => {
      const app = { app: true };
      const createServer = jest.fn(() => ({ listen: jest.fn() }));
      jest.doMock("dotenv", () => ({ config: jest.fn() }));
      jest.doMock("http", () => ({ createServer }));
      jest.doMock("../../app", () => app);
      jest.doMock("../../database/db", () => jest.fn().mockResolvedValue(undefined));

      jest.isolateModules(() => {
        require("../../server");
      });

      await Promise.resolve();
      expect(createServer).toHaveBeenCalledWith(app);
    });

    it("listens on provided PORT", async () => {
      process.env.PORT = "7777";
      const listen = jest.fn((_, cb) => cb && cb());
      jest.doMock("dotenv", () => ({ config: jest.fn() }));
      jest.doMock("http", () => ({ createServer: jest.fn(() => ({ listen })) }));
      jest.doMock("../../app", () => ({}));
      jest.doMock("../../database/db", () => jest.fn().mockResolvedValue(undefined));

      jest.isolateModules(() => {
        require("../../server");
      });

      await Promise.resolve();
      expect(listen).toHaveBeenCalledWith("7777", expect.any(Function));
    });

    it("logs and exits when DB connection fails", async () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
      jest.doMock("dotenv", () => ({ config: jest.fn() }));
      jest.doMock("http", () => ({ createServer: jest.fn(() => ({ listen: jest.fn() })) }));
      jest.doMock("../../app", () => ({}));
      jest.doMock("../../database/db", () => jest.fn().mockRejectedValue(new Error("db-fail")));

      jest.isolateModules(() => {
        require("../../server");
      });

      await Promise.resolve();
      expect(errSpy).toHaveBeenCalledWith("Failed to start server:", expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);
      errSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe("route wiring", () => {
    const setupExpressRouterMock = () => {
      const router = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        put: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        use: jest.fn().mockReturnThis(),
      };
      const express = { Router: jest.fn(() => router) };
      jest.doMock("express", () => express);
      return { router };
    };

    it("authRoutes registers signup/login routes", () => {
      const { router } = setupExpressRouterMock();
      const ctrl = {
        signup: jest.fn(), login: jest.fn(), getMe: jest.fn(), updateMe: jest.fn(), refresh: jest.fn(), forgotPassword: jest.fn(), resetPassword: jest.fn(),
      };
      jest.doMock("../../controllers/authController", () => ctrl);
      jest.doMock("../../middleware/authMiddleware", () => jest.fn());

      require("../../routes/authRoutes");

      expect(router.post).toHaveBeenCalledWith("/signup", ctrl.signup);
      expect(router.post).toHaveBeenCalledWith("/login", ctrl.login);
    });

    it("authRoutes registers forgot/reset password routes", () => {
      const { router } = setupExpressRouterMock();
      const ctrl = {
        signup: jest.fn(), login: jest.fn(), getMe: jest.fn(), updateMe: jest.fn(), refresh: jest.fn(), forgotPassword: jest.fn(), resetPassword: jest.fn(),
      };
      jest.doMock("../../controllers/authController", () => ctrl);
      jest.doMock("../../middleware/authMiddleware", () => jest.fn());

      require("../../routes/authRoutes");

      expect(router.post).toHaveBeenCalledWith("/forgot-password", ctrl.forgotPassword);
      expect(router.post).toHaveBeenCalledWith("/reset-password/:token", ctrl.resetPassword);
    });

    it("authRoutes protects /me endpoints", () => {
      const { router } = setupExpressRouterMock();
      const ctrl = {
        signup: jest.fn(), login: jest.fn(), getMe: jest.fn(), updateMe: jest.fn(), refresh: jest.fn(), forgotPassword: jest.fn(), resetPassword: jest.fn(),
      };
      const authMiddleware = jest.fn();
      jest.doMock("../../controllers/authController", () => ctrl);
      jest.doMock("../../middleware/authMiddleware", () => authMiddleware);

      require("../../routes/authRoutes");

      expect(router.get).toHaveBeenCalledWith("/me", authMiddleware, ctrl.getMe);
      expect(router.patch).toHaveBeenCalledWith("/me", authMiddleware, ctrl.updateMe);
    });

    it("favoriteRoutes applies auth middleware with router.use", () => {
      const { router } = setupExpressRouterMock();
      const authMiddleware = jest.fn();
      jest.doMock("../../middleware/authMiddleware", () => authMiddleware);
      jest.doMock("../../controllers/favoriteController", () => ({ addFavorite: jest.fn(), getFavorites: jest.fn(), removeFavorite: jest.fn() }));

      require("../../routes/favoriteRoutes");

      expect(router.use).toHaveBeenCalledWith(authMiddleware);
    });

    it("favoriteRoutes registers CRUD endpoints", () => {
      const { router } = setupExpressRouterMock();
      const ctrl = { addFavorite: jest.fn(), getFavorites: jest.fn(), removeFavorite: jest.fn() };
      jest.doMock("../../middleware/authMiddleware", () => jest.fn());
      jest.doMock("../../controllers/favoriteController", () => ctrl);

      require("../../routes/favoriteRoutes");

      expect(router.post).toHaveBeenCalledWith("/:restaurantId", ctrl.addFavorite);
      expect(router.get).toHaveBeenCalledWith("/", ctrl.getFavorites);
      expect(router.delete).toHaveBeenCalledWith("/:restaurantId", ctrl.removeFavorite);
    });

    it("foodFavoriteRoutes applies auth middleware", () => {
      const { router } = setupExpressRouterMock();
      const authMiddleware = jest.fn();
      jest.doMock("../../middleware/authMiddleware", () => authMiddleware);
      jest.doMock("../../controllers/foodFavoriteController", () => ({ addFoodFavorite: jest.fn(), getFoodFavorites: jest.fn(), removeFoodFavorite: jest.fn() }));

      require("../../routes/foodFavoriteRoutes");

      expect(router.use).toHaveBeenCalledWith(authMiddleware);
    });

    it("foodFavoriteRoutes registers endpoints", () => {
      const { router } = setupExpressRouterMock();
      const ctrl = { addFoodFavorite: jest.fn(), getFoodFavorites: jest.fn(), removeFoodFavorite: jest.fn() };
      jest.doMock("../../middleware/authMiddleware", () => jest.fn());
      jest.doMock("../../controllers/foodFavoriteController", () => ctrl);

      require("../../routes/foodFavoriteRoutes");

      expect(router.post).toHaveBeenCalledWith("/:restaurantId/:foodId", ctrl.addFoodFavorite);
      expect(router.get).toHaveBeenCalledWith("/", ctrl.getFoodFavorites);
      expect(router.delete).toHaveBeenCalledWith("/:restaurantId/:foodId", ctrl.removeFoodFavorite);
    });

    it("recommendationRoutes protects GET /", () => {
      const { router } = setupExpressRouterMock();
      const authMiddleware = jest.fn();
      const ctrl = { getRecommendations: jest.fn() };
      jest.doMock("../../middleware/authMiddleware", () => authMiddleware);
      jest.doMock("../../controllers/recommendationController", () => ctrl);

      require("../../routes/recommendationRoutes");

      expect(router.get).toHaveBeenCalledWith("/", authMiddleware, ctrl.getRecommendations);
    });

    it("uploadRoutes registers /presigned-url with auth", () => {
      const { router } = setupExpressRouterMock();
      const authMiddleware = jest.fn();
      const ctrl = { getPresignedUploadUrl: jest.fn(), uploadToCloudinary: jest.fn() };
      const single = jest.fn(() => "singleMw");
      const multer = jest.fn(() => ({ single }));
      multer.memoryStorage = jest.fn(() => "memoryStorage");
      jest.doMock("../../middleware/authMiddleware", () => authMiddleware);
      jest.doMock("../../controllers/uploadController", () => ctrl);
      jest.doMock("multer", () => multer);

      require("../../routes/uploadRoutes");

      expect(router.post).toHaveBeenCalledWith("/presigned-url", authMiddleware, ctrl.getPresignedUploadUrl);
    });

    it("uploadRoutes registers protected /cloudinary upload", () => {
      const { router } = setupExpressRouterMock();
      const authMiddleware = jest.fn();
      const ctrl = { getPresignedUploadUrl: jest.fn(), uploadToCloudinary: jest.fn() };
      const single = jest.fn(() => "singleMw");
      const multer = jest.fn(() => ({ single }));
      multer.memoryStorage = jest.fn(() => "memoryStorage");
      jest.doMock("../../middleware/authMiddleware", () => authMiddleware);
      jest.doMock("../../controllers/uploadController", () => ctrl);
      jest.doMock("multer", () => multer);

      require("../../routes/uploadRoutes");

      expect(router.post).toHaveBeenCalledWith("/cloudinary", authMiddleware, "singleMw", ctrl.uploadToCloudinary);
    });

    it("uploadRoutes registers unprotected test upload routes", () => {
      const { router } = setupExpressRouterMock();
      const ctrl = { getPresignedUploadUrl: jest.fn(), uploadToCloudinary: jest.fn() };
      const single = jest.fn(() => "singleMw");
      const multer = jest.fn(() => ({ single }));
      multer.memoryStorage = jest.fn(() => "memoryStorage");
      jest.doMock("../../middleware/authMiddleware", () => jest.fn());
      jest.doMock("../../controllers/uploadController", () => ctrl);
      jest.doMock("multer", () => multer);

      require("../../routes/uploadRoutes");

      expect(router.post).toHaveBeenCalledWith("/cloudinary/test", "singleMw", ctrl.uploadToCloudinary);
      expect(router.post).toHaveBeenCalledWith("/cloudinary-test", "singleMw", ctrl.uploadToCloudinary);
    });
  });
});
