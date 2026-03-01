"use strict";
// @ts-nocheck
const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 20000,
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};
module.exports = connectDB;
//# sourceMappingURL=db.js.map