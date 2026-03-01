"use strict";
// @ts-nocheck
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getRecommendations } = require('../controllers/recommendationController');
const router = express.Router();
router.get('/', authMiddleware, getRecommendations);
module.exports = router;
//# sourceMappingURL=recommendationRoutes.js.map