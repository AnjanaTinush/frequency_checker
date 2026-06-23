const Pusher = require("pusher");
const mqttService = require("../services/mqtt.service");

// Initialize Pusher directly with your credentials
const pusher = new Pusher({
  appId: "2169886",
  key: "37eddc60d27348eb95f7",
  secret: "67d7f2722358742b4128",
  cluster: "ap1",
  useTLS: true,
});

/**
 * Handles incoming JSON CSI packets from the Python application
 * Every 1 second, it broadcasts the payload instantly to the React frontend
 */
const streamCsiData = async (req, res) => {
  try {
    const csiPayload = req.body;

    // Validate that the request contains valid JSON data
    if (!csiPayload || Object.keys(csiPayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload: JSON data is required.",
      });
    }

    // Instantly trigger Pusher to broadcast the payload to the React frontend map
    await pusher.trigger("wifi-sensing-channel", "csi-update", {
      timestamp: new Date().toISOString(),
      payload: csiPayload,
    });

    // Respond back to the Python app so it can clear its buffer/queue
    return res.status(200).json({
      success: true,
      message: "CSI Packet broadcasted to React frontend successfully.",
    });
  } catch (error) {
    console.error("Pusher Broadcast Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to broadcast real-time data via Pusher.",
      error: error.message,
    });
  }
};

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

const getStreamStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "CSI Stream gateway is online and ready for Python POST payloads.",
    endpoint: "/api/csi-stream"
  });
};

module.exports = {
  streamCsiData, // Added function export
  getHealth,
  getMqttStatus,
  publishMessage,
  subscribeTopic,
  getMessages,
  mqttSelfTest,
  getStreamStatus
};