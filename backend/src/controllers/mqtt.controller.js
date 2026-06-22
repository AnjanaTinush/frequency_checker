const mqttService = require("../services/mqtt.service");

const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Node backend is running",
    timestamp: new Date().toISOString(),
  });
};

const getMqttStatus = (req, res) => {
  res.status(200).json({
    success: true,
    data: mqttService.getStatus(),
  });
};

const publishMessage = async (req, res) => {
  try {
    const { topic, message } = req.body;

    if (!topic || !message) {
      return res.status(400).json({
        success: false,
        message: "topic and message are required",
      });
    }

    const result = await mqttService.publish(topic, message);

    res.status(200).json({
      success: true,
      message: "Message published successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to publish MQTT message",
      error: error.message,
    });
  }
};

const subscribeTopic = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: "topic is required",
      });
    }

    const result = await mqttService.subscribe(topic);

    res.status(200).json({
      success: true,
      message: "Subscribed successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to subscribe MQTT topic",
      error: error.message,
    });
  }
};

const getMessages = (req, res) => {
  res.status(200).json({
    success: true,
    data: mqttService.getMessages(),
  });
};

const mqttSelfTest = async (req, res) => {
  try {
    const result = await mqttService.selfTest();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "MQTT self-test failed",
      error: error.message,
    });
  }
};

module.exports = {
  getHealth,
  getMqttStatus,
  publishMessage,
  subscribeTopic,
  getMessages,
  mqttSelfTest,
};