"use strict";
// @ts-nocheck
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { sendEmail } = require('../utils/mailer');
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;
const buildUserResponse = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    createdAt: user.createdAt,
});
const setRefreshCookie = (res, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
        path: '/api/auth',
    });
};
const signup = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required',
            });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role });
        const accessToken = generateAccessToken({ id: user._id, role: user.role });
        const refreshToken = generateRefreshToken({ id: user._id, role: user.role });
        setRefreshCookie(res, refreshToken);
        return res.status(201).json({
            success: true,
            message: 'Signup successful',
            data: {
                user: buildUserResponse(user),
                accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        return next(error);
    }
};
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const accessToken = generateAccessToken({ id: user._id, role: user.role });
        const refreshToken = generateRefreshToken({ id: user._id, role: user.role });
        setRefreshCookie(res, refreshToken);
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: buildUserResponse(user),
                accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        return next(error);
    }
};
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'Profile retrieved',
            data: buildUserResponse(user),
        });
    }
    catch (error) {
        return next(error);
    }
};
const updateMe = async (req, res, next) => {
    try {
        const { name, profileImage } = req.body;
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (name !== undefined)
            user.name = name;
        if (profileImage !== undefined)
            user.profileImage = profileImage;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Profile updated',
            data: buildUserResponse(user),
        });
    }
    catch (error) {
        return next(error);
    }
};
const refresh = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token)
            return res.status(401).json({ success: false, message: 'Refresh token missing' });
        const jwt = require('jsonwebtoken');
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        }
        catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }
        const user = await User.findById(decoded.id).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const accessToken = generateAccessToken({ id: user._id, role: user.role });
        // Optionally rotate refresh token
        const refreshToken = generateRefreshToken({ id: user._id, role: user.role });
        setRefreshCookie(res, refreshToken);
        return res.status(200).json({ success: true, message: 'Token refreshed', data: { user: buildUserResponse(user), accessToken } });
    }
    catch (error) {
        return next(error);
    }
};
const forgotPassword = async (req, res, next) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        const user = await User.findOne({ email });
        if (user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
            const resetLink = `${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
            user.resetPasswordToken = hashedToken;
            user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
            await user.save();
            const subject = 'Reset your Bite Finder password';
            const text = `Reset your password using this link: ${resetLink}. This link expires in 15 minutes.`;
            const html = `
        <p>Hello ${user.name || 'there'},</p>
        <p>You requested a password reset for your Bite Finder account.</p>
        <p><a href="${resetLink}">Reset your password</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `;
            await sendEmail({ to: user.email, subject, text, html });
        }
        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a reset link has been sent.',
        });
    }
    catch (error) {
        return next(error);
    }
};
const resetPassword = async (req, res, next) => {
    try {
        const token = String(req.params?.token || '').trim();
        const password = String(req.body?.password || '');
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully',
        });
    }
    catch (error) {
        return next(error);
    }
};
module.exports = {
    signup,
    login,
    getMe,
    updateMe,
    refresh,
    forgotPassword,
    resetPassword,
};
//# sourceMappingURL=authController.js.map