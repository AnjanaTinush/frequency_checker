require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/db.config");
const mqttService = require("./services/mqtt.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    mqttService.connect();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
  }
};

startServer();