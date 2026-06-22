require("dotenv").config();

const fs = require("fs");
const path = require("path");

const getValue = (value) => {
  if (!value || String(value).trim() === "") {
    return undefined;
  }

  return String(value).trim();
};

const getCaCertificate = () => {
  const caPath = getValue(process.env.MQTT_CA_PATH);

  if (!caPath) {
    return undefined;
  }

  const fullPath = path.isAbsolute(caPath)
    ? caPath
    : path.join(process.cwd(), caPath);

  if (!fs.existsSync(fullPath)) {
    console.warn("[MQTT] CA certificate file not found:", fullPath);
    return undefined;
  }

  return fs.readFileSync(fullPath);
};

const caCertificate = getCaCertificate();

const mqttConfig = {
  brokerUrl:
    getValue(process.env.MQTT_BROKER_URL) ||
    "mqtts://q244d481.ala.asia-southeast1.emqxsl.com:8883",

  options: {
    clientId:
      getValue(process.env.MQTT_CLIENT_ID) ||
      `node_backend_${Math.random().toString(16).slice(2, 10)}`,

    username: getValue(process.env.MQTT_USERNAME),
    password: getValue(process.env.MQTT_PASSWORD),

    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    keepalive: 60,

    rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== "false",

    ca: caCertificate ? [caCertificate] : undefined,
  },
};

module.exports = mqttConfig;