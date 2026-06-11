import mongoose from "mongoose";

let mongoServer;

export async function connectDB() {
  let mongoUri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || "sports_management";

  if (!mongoUri) {
    console.log("No MONGO_URI specified. Attempting to start in-memory MongoDB server...");
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log(`In-memory MongoDB server started at: ${mongoUri}`);
    } catch (err) {
      console.error("Failed to start in-memory MongoDB server:", err.message);
      console.log("Falling back to local default MongoDB URI...");
      mongoUri = "mongodb://127.0.0.1:27017/sports_management";
    }
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
