const dns = require("node:dns");
const mongoose = require("mongoose");

if (!process.env.VERCEL) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

let connectionPromise = null;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
      })
      .then((instance) => {
        console.log("MongoDB connected:", instance.connection.host);
        return instance.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error("MongoDB error:", error.message);
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDatabase;