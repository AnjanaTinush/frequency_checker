const express = require("express");
const {
  getHealth,
  getMqttStatus,
  publishMessage,
  subscribeTopic,
  getMessages,
  mqttSelfTest,
} = require("../controllers/mqtt.controller");

const router = express.Router();

router.get("/health", getHealth);

router.get("/mqtt/status", getMqttStatus);

router.post("/mqtt/publish", publishMessage);

router.post("/mqtt/subscribe", subscribeTopic);

router.get("/mqtt/messages", getMessages);

router.post("/mqtt/self-test", mqttSelfTest);

module.exports = router;