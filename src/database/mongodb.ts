import mongoose from "mongoose";

export const connectDatabaseTest = async (): Promise<void> => {
  const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI_TEST or MONGO_URI must be set for tests");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 20000,
  });
};
