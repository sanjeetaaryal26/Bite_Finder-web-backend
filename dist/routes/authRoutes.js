"use strict";
// @ts-nocheck
const express = require('express');
const { signup, login, getMe, updateMe, refresh, forgotPassword, resetPassword, } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.get('/refresh', refresh);
module.exports = router;
//# sourceMappingURL=authRoutes.js.map