import mongoose from "mongoose";
import { connectDatabaseTest } from "../database/mongodb";

beforeAll(async () => {
    await connectDatabaseTest();
});

afterAll(async () => {
    await mongoose.connection.close();
});