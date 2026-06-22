const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDatabase = require("./config/db.config");
const mqttRoutes = require("./routes/mqtt.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Frequency Checker API is running",
  });
});

app.use("/api", mqttRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

module.exports = app;