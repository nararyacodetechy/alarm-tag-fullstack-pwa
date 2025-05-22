// libs/mqttService.ts
import mqtt, { MqttClient } from 'mqtt';
import { PrismaClient } from '@prisma/client';
import { Device } from '@/types/device';

const prisma = new PrismaClient();
const subscribedTopics = new Set<string>();

let client: MqttClient | null = null;

export const clearRetainedMessage = (topic: string) => {
  if (client?.connected) {
    client.publish(topic, '', { retain: true }, (err) => {
      if (err) {
        console.error(`❌ Failed to clear retained message for ${topic}:`, err);
      } else {
        console.log(`🧹 Cleared retained message for ${topic}`);
      }
    });
  }
};
  
export const connectMqtt = (): MqttClient => {
  if (client && client.connected) {
    console.log('[MQTT SERVICE] MQTT client already connected');
    return client;
  }

  const broker = process.env.NEXT_PUBLIC_MQTT_BROKER;
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

  if (!broker || !username || !password) {
    console.error('[MQTT SERVICE] Missing MQTT environment variables');
    throw new Error('MQTT environment variables are not defined');
  }

  client = mqtt.connect(broker, {
    username,
    password,
    reconnectPeriod: 1000, // Coba reconnect setiap 1 detik
    keepalive: 10, // Ping setiap 10 detik
    connectTimeout: 30000, // Timeout koneksi 30 detik
    clientId: `nextag_${Math.random().toString(16).slice(3)}`, // ID unik untuk mencegah konflik
  });

  client.on('connect', () => {
    console.log(`[MQTT SERVICE] Connected to broker at ${new Date().toISOString()}`);
  });

  client.on('error', (error) => {
    console.error('[MQTT SERVICE] MQTT Error:', error);
  });

  client.on('close', () => {
    console.log('[MQTT SERVICE] Connection closed');
    // Tidak mengatur client = null, biarkan reconnect otomatis
  });

  client.on('reconnect', () => {
    console.log('[MQTT SERVICE] Attempting to reconnect...');
  });

  return client;
};

export const subscribeToTopic = (topic: string, callback?: (err: Error | null) => void) => {
  if (!client) {
    console.error('[MQTT SERVICE] MQTT client not initialized');
    return;
  }

  if (subscribedTopics.has(topic)) {
    console.log(`[MQTT SERVICE] Already subscribed to ${topic}`);
    return;
  }

  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`[MQTT SERVICE] Failed to subscribe to ${topic}:`, err);
    } else {
      subscribedTopics.add(topic);
      console.log(`[MQTT SERVICE] Subscribed to ${topic}`);
    }
    callback?.(err);
  });
};

export const startMqttService = () => {
  const mqttClient = connectMqtt();

  mqttClient.on('connect', async () => {
    try {
      const devices: Device[] = await prisma.device.findMany(); // Gunakan tipe Device dari Prisma
      devices.forEach((device: Device) => {
        clearRetainedMessage(`parcela/${device.device_id}/register`);
        clearRetainedMessage(`parcela/${device.device_id}/status`);
      });
    } catch (err) {
      console.error('[MQTT SERVICE] Failed to fetch devices for clearing retained messages:', err);
    }

    // 📡 Subscribe ke topik-topik penting
    const registerTopic = 'parcela/+/register';
    subscribeToTopic(registerTopic, (err) => {
      if (err) {
        console.error(`[MQTT SERVICE] Failed to subscribe to ${registerTopic}:`, err);
      } else {
        console.log(`[MQTT SERVICE] Subscribed to ${registerTopic}`);
      }
    });

    const statusTopic = 'parcela/+/status';
    subscribeToTopic(statusTopic, (err) => {
      if (err) {
        console.error(`[MQTT SERVICE] Failed to subscribe to ${statusTopic}:`, err);
      } else {
        console.log(`[MQTT SERVICE] Subscribed to ${statusTopic}`);
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    const msgString = message.toString();
    console.log(`[MQTT SERVICE] Message received, Topic: ${topic} | Message: ${msgString}`);

    // Handle pesan register
    if (topic.match(/^parcela\/[^/]+\/register$/)) {
      try {
        if (!msgString) return;
        const payload = JSON.parse(msgString);
        const { deviceId, status } = payload;

        if (!deviceId || !status) return;

        await prisma.device.upsert({
          where: { device_id: deviceId },
          update: {
            status,
            last_seen: new Date().toDateString(),
            updated_at: new Date(),
          },
          create: {
            device_id: deviceId,
            status,
            last_seen: new Date().toDateString(),
          },
        });

        console.log(`[MQTT SERVICE] Device upsert successful: ${deviceId} with status ${status}`);
      } catch (err) {
        console.error('[MQTT SERVICE] Failed to process register:', err);
      }
    }

    // Handle pesan status disconnect (LWT)
    if (topic.match(/^parcela\/[^/]+\/status$/)) {
      try {
        if (!msgString) return;
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

        console.log(`[MQTT SERVICE] Device status updated to '${status}': ${deviceId}`);

        if (status.toLowerCase() === 'offline') {
          const controlTopic = `parcela/${deviceId}/control`;
          const alarmOffPayload = 'ALARM_OFF';
          const recentlyPublished: Record<string, number> = {};

          const publishAlarmOff = () => {
            const now = Date.now();
            if (recentlyPublished[controlTopic] && now - recentlyPublished[controlTopic] < 5000) {
              return;
            }

            recentlyPublished[controlTopic] = now;

            if (client?.connected) {
              client.publish(controlTopic, alarmOffPayload, {}, (err) => {
                if (err) {
                  console.error(`[MQTT SERVICE] Failed to publish ALARM_OFF to ${controlTopic}:`, err);
                } else {
                  console.log(`[MQTT SERVICE] ALARM_OFF sent to ${controlTopic}`);
                }
              });
            }
          };

          publishAlarmOff();
          setTimeout(publishAlarmOff, 2000);
          setTimeout(publishAlarmOff, 5000);
        }
      } catch (err) {
        console.error('[MQTT SERVICE] Failed to process device status:', err);
      }
    }   
  });
};


export const stopMqttService = () => {
  if (client) {
    client.end(true);
    console.log('[MQTT SERVICE] MQTT Service stopped');
    client = null;
  }
};

export const getMqttClient = () => client;
