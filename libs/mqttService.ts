// libs/mqttService.ts
import mqtt, { MqttClient } from 'mqtt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let client: MqttClient | null = null;
  
export const connectMqtt = (): MqttClient => {
  if (client && client.connected) {
    return client;
  }

  const broker = process.env.NEXT_PUBLIC_MQTT_BROKER;
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

  if (!broker || !username || !password) {
    throw new Error('MQTT environment variables are not defined');
  }

  client = mqtt.connect(broker, {
    username,
    password,
  });

  client.on('error', (error) => {
    console.error('❌ MQTT Service Error:', error);
  });

  client.on('close', () => {
    console.log('🔌 MQTT Service: Connection closed');
    client = null; // Reset client on close
  });

  return client;
};

export const subscribeToTopic = (topic: string, callback?: (err: Error | null) => void) => {
  if (!client) {
    console.error('❌ MQTT client not initialized');
    return;
  }
  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe to ${topic}:`, err);
    } else {
      console.log(`📡 Subscribed to ${topic}`);
    }
    callback?.(err);
  });
};

export const startMqttService = () => {
  const mqttClient = connectMqtt();

  mqttClient.on('connect', () => {
    console.log('✅ MQTT Service: Connected to broker');

    subscribeToTopic('parcela/+/register', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to parcela/+/register:', err);
      } else {
        console.log('📡 Subscribed to parcela/+/register');
      }
    });

    // ✅ SUBSCRIBE ke topik LWT
    subscribeToTopic('parcela/+/status', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to parcela/+/status:', err);
      } else {
        console.log('📡 Subscribed to parcela/+/status');
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    const msgString = message.toString();
    console.log(`📨 MQTT Message Received on topic: ${topic} | message: ${msgString}`);
  
    // ✅ Handle pesan register (ESP device online)
    if (topic.match(/^parcela\/[^/]+\/register$/)) {
      try {
        const payload = JSON.parse(msgString);
        const { deviceId, status } = payload;
  
        if (!deviceId || !status) return;
  
        await prisma.device.upsert({
          where: { device_id: deviceId },
          update: {
            status,
            last_seen: new Date(),
            updated_at: new Date(),
          },
          create: {
            device_id: deviceId,
            status,
            last_seen: new Date(),
          },
        });
  
        console.log(`✅ Device upsert successful: ${deviceId} with status ${status}`);
      } catch (err) {
        console.error("❌ Failed to process register:", err);
      }
    }
  
    // ✅ Handle pesan status disconnect (LWT)
    if (topic.match(/^parcela\/[^/]+\/status$/)) {
      try {
        const payload = JSON.parse(msgString);
        const { deviceId, status } = payload;
  
        if (!deviceId || !status) return;
  
        await prisma.device.updateMany({
          where: { device_id: deviceId },
          data: {
            status,
            updated_at: new Date(),
          },
        });
  
        console.log(`⚠️ Device status updated to '${status}': ${deviceId}`);
      } catch (err) {
        console.error("❌ Failed to process device status:", err);
      }
    }
  });
  
};


export const stopMqttService = () => {
  if (client) {
    client.end(true);
    console.log('🔌 MQTT Service stopped');
    client = null;
  }
};

export const getMqttClient = () => client;
