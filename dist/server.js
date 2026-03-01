"use strict";
// @ts-nocheck
const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const app = require('./app');
const connectDB = require('./database/db');
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await connectDB();
        const server = http.createServer(app);
        server.listen(PORT, () => {
            console.log(`Bite Finder Backend running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map