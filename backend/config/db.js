import mongoose from "mongoose";

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || "sports_management";

  if (!mongoUri) {
    console.error("MONGO_URI is required. Configure it with your MongoDB Atlas connection string.");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected: ${connection.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

export async function getDBStatus() {
  const connection = mongoose.connection;
  const collections = connection.db
    ? await connection.db.listCollections().toArray()
    : [];

  return {
    connected: connection.readyState === 1,
    name: connection.name || "",
    host: connection.host || "",
    collections: collections.map((collection) => collection.name).sort(),
  };
}
