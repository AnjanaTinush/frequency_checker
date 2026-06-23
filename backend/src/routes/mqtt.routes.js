const express = require("express");
const {
  getHealth,
  getMqttStatus,
  publishMessage,
  subscribeTopic,
  getMessages,
  mqttSelfTest,
} = require("../controllers/mqtt.controller");
const { streamCsiData } = require("../controllers/mqtt.controller"); // Adjust path if needed

const router = express.Router();

router.get("/health", getHealth);

router.get("/mqtt/status", getMqttStatus);

router.post("/mqtt/publish", publishMessage);

router.post("/mqtt/subscribe", subscribeTopic);

router.get("/mqtt/messages", getMessages);

router.post("/mqtt/self-test", mqttSelfTest);

router.post("/csi-stream", streamCsiData);

module.exports = router;