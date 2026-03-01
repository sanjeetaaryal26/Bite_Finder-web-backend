declare const bcrypt: any;
declare const crypto: any;
declare const User: any;
declare const generateAccessToken: any, generateRefreshToken: any;
declare const sendEmail: any;
declare const REFRESH_TOKEN_MAX_AGE_MS: number;
declare const RESET_TOKEN_EXPIRES_MS: number;
declare const buildUserResponse: (user: any) => {
    id: any;
    name: any;
    email: any;
    role: any;
    profileImage: any;
    createdAt: any;
};
declare const setRefreshCookie: (res: any, refreshToken: any) => void;
declare const signup: (req: any, res: any, next: any) => Promise<any>;
declare const login: (req: any, res: any, next: any) => Promise<any>;
declare const getMe: (req: any, res: any, next: any) => Promise<any>;
declare const updateMe: (req: any, res: any, next: any) => Promise<any>;
declare const refresh: (req: any, res: any, next: any) => Promise<any>;
declare const forgotPassword: (req: any, res: any, next: any) => Promise<any>;
declare const resetPassword: (req: any, res: any, next: any) => Promise<any>;
//# sourceMappingURL=authController.d.ts.map