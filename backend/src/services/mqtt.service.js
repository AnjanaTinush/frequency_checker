const mqtt = require("mqtt");
const mqttConfig = require("../config/mqtt.config");

class MqttService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscribedTopics = new Set();
    this.messages = [];
  }

  connect() {
    if (this.client) {
      return this.client;
    }

    console.log("[MQTT] Connecting to:", mqttConfig.brokerUrl);

    this.client = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

    this.client.on("connect", () => {
      this.connected = true;
      console.log("[MQTT] Connected successfully");
    });

    this.client.on("reconnect", () => {
      console.log("[MQTT] Reconnecting...");
    });

    this.client.on("close", () => {
      this.connected = false;
      console.log("[MQTT] Connection closed");
    });

    this.client.on("offline", () => {
      this.connected = false;
      console.log("[MQTT] Client offline");
    });

    this.client.on("error", (error) => {
      this.connected = false;
      console.error("[MQTT] Error:", error.message);
    });

    this.client.on("message", (topic, payload) => {
      const message = {
        topic,
        message: payload.toString(),
        receivedAt: new Date().toISOString(),
      };

      this.messages.unshift(message);

      if (this.messages.length > 50) {
        this.messages.pop();
      }

      console.log("[MQTT] Message received:", message);
    });

    return this.client;
  }

  waitForConnection(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        return resolve(true);
      }

      if (!this.client) {
        this.connect();
      }

      const timeout = setTimeout(() => {
        this.client.removeListener("connect", onConnect);

        reject(
          new Error(
            "MQTT connection timeout. Please check broker URL, port, username, password, and TLS settings."
          )
        );
      }, timeoutMs);

      const onConnect = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      this.client.once("connect", onConnect);
    });
  }

  getStatus() {
    return {
      connected: this.connected,
      brokerUrl: mqttConfig.brokerUrl,
      clientId: mqttConfig.options.clientId,
      username: mqttConfig.options.username,
      subscribedTopics: Array.from(this.subscribedTopics),
    };
  }

  async publish(topic, message, options = {}) {
    await this.waitForConnection();

    return new Promise((resolve, reject) => {
      this.client.publish(topic, String(message), options, (error) => {
        if (error) {
          return reject(error);
        }

        resolve({
          topic,
          message,
          publishedAt: new Date().toISOString(),
        });
      });
    });
  }

  async subscribe(topic) {
    await this.waitForConnection();

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, { qos: 0 }, (error) => {
        if (error) {
          return reject(error);
        }

        this.subscribedTopics.add(topic);

        resolve({
          topic,
          subscribedAt: new Date().toISOString(),
        });
      });
    });
  }

  getMessages() {
    return this.messages;
  }

  async selfTest() {
    await this.waitForConnection();

    const topic = `frequency/backend/self-test/${Date.now()}`;

    const payload = JSON.stringify({
      success: true,
      message: "MQTT backend self test",
      timestamp: new Date().toISOString(),
    });

    await this.subscribe(topic);

    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.client.removeListener("message", onMessage);

        reject(
          new Error(
            "Self-test timeout. Message was published but backend did not receive it back."
          )
        );
      }, 7000);

      const onMessage = (receivedTopic, buffer) => {
        const receivedMessage = buffer.toString();

        if (receivedTopic === topic && receivedMessage === payload) {
          clearTimeout(timeout);
          this.client.removeListener("message", onMessage);

          resolve({
            success: true,
            message: "MQTT self-test completed successfully",
            topic,
            publishedPayload: payload,
            receivedPayload: receivedMessage,
            receivedAt: new Date().toISOString(),
          });
        }
      };

      this.client.on("message", onMessage);

      try {
        await this.publish(topic, payload);
      } catch (error) {
        clearTimeout(timeout);
        this.client.removeListener("message", onMessage);
        reject(error);
      }
    });
  }
}

module.exports = new MqttService();