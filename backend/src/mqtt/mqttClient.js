import mqtt from "mqtt";
import { env } from "../config/mqtt.config.js";

let client = null;
let isConnected = false;

const receivedMessages = [];

export const connectMqtt = () => {
  const options = {
    clientId: env.mqtt.clientId,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 30 * 1000,
  };

  if (env.mqtt.username && env.mqtt.password) {
    options.username = env.mqtt.username;
    options.password = env.mqtt.password;
  }

  client = mqtt.connect(env.mqtt.brokerUrl, options);

  client.on("connect", () => {
    isConnected = true;
    console.log("MQTT connected successfully");

    client.subscribe("devices/+/reply", { qos: 1 }, (error) => {
      if (error) {
        console.error("Default subscribe error:", error.message);
      } else {
        console.log("Subscribed to devices/+/reply");
      }
    });
  });

  client.on("message", (topic, payload) => {
    const message = payload.toString();

    const data = {
      topic,
      message,
      receivedAt: new Date().toISOString(),
    };

    receivedMessages.unshift(data);

    if (receivedMessages.length > 100) {
      receivedMessages.pop();
    }

    console.log("MQTT message received:", data);
  });

  client.on("error", (error) => {
    isConnected = false;
    console.error("MQTT error:", error.message);
  });

  client.on("close", () => {
    isConnected = false;
    console.log("MQTT connection closed");
  });

  return client;
};

export const getMqttClient = () => {
  if (!client) {
    throw new Error("MQTT client is not initialized");
  }

  return client;
};

export const getMqttStatus = () => {
  return {
    connected: isConnected,
    brokerUrl: env.mqtt.brokerUrl,
    clientId: env.mqtt.clientId,
  };
};

export const publishMqttMessage = ({ topic, message, qos = 1, retain = false }) => {
  return new Promise((resolve, reject) => {
    if (!client || !isConnected) {
      return reject(new Error("MQTT client is not connected"));
    }

    client.publish(topic, JSON.stringify(message), { qos, retain }, (error) => {
      if (error) {
        return reject(error);
      }

      resolve({
        topic,
        message,
        qos,
        retain,
        publishedAt: new Date().toISOString(),
      });
    });
  });
};

export const subscribeMqttTopic = ({ topic, qos = 1 }) => {
  return new Promise((resolve, reject) => {
    if (!client || !isConnected) {
      return reject(new Error("MQTT client is not connected"));
    }

    client.subscribe(topic, { qos }, (error) => {
      if (error) {
        return reject(error);
      }

      resolve({
        topic,
        qos,
        subscribedAt: new Date().toISOString(),
      });
    });
  });
};

export const getReceivedMessages = () => {
  return receivedMessages;
};