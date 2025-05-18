// libs/mqttService.ts
import mqtt, { MqttClient } from 'mqtt';
import { PrismaClient } from '@prisma/client';

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

  if (subscribedTopics.has(topic)) {
    console.log(`⚠️ Already subscribed to ${topic}`);
    return;
  }

  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe to ${topic}:`, err);
    } else {
      subscribedTopics.add(topic);
    }
    callback?.(err);
  });
};

export const startMqttService = () => {
  const mqttClient = connectMqtt();

  mqttClient.on('connect', async () => {
    // 🔄 Ambil semua device dan hapus retained messages untuk topik register dan status
    try {
      const devices = await prisma.device.findMany();
      devices.forEach((device) => {
        clearRetainedMessage(`parcela/${device.device_id}/register`);
        clearRetainedMessage(`parcela/${device.device_id}/status`);
      });
    } catch (err) {
      console.error('❌ Failed to fetch devices for clearing retained messages:', err);
    }

    // 📡 Subscribe ke topik-topik penting
    const registerTopic = 'parcela/+/register';
    subscribeToTopic(registerTopic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${registerTopic}:`, err);
      } else {
        console.log(`📡 Subscribed to ${registerTopic}`);
      }
    });

    const statusTopic = 'parcela/+/status';
    subscribeToTopic(statusTopic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${statusTopic}:`, err);
      } else {
        console.log(`📡 Subscribed to ${statusTopic}`);
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    const msgString = message.toString();
    console.log(`📨 MQTT message, Device: ${topic} | message: ${msgString}`);
  
    // ✅ Handle pesan register (ESP device online)
    if (topic.match(/^parcela\/[^/]+\/register$/)) {
      try {
        if (!msgString) return; // 🛡️ Skip jika message kosong
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
        if (!msgString) return; // 🛡️ Skip jika message kosong
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
    
        // ✅ Kirim perintah ALARM_OFF jika disconnect
        if (status.toLowerCase() === 'offline') {
          const controlTopic = `parcela/${deviceId}/control`;
          const alarmOffPayload = 'ALARM_OFF';
          const recentlyPublished: Record<string, number> = {};
          
          const publishAlarmOff = () => {
            const now = Date.now();
            if (recentlyPublished[controlTopic] && now - recentlyPublished[controlTopic] < 5000) {
              return; // Skip jika dalam 5 detik sudah pernah publish
            }
          
            recentlyPublished[controlTopic] = now;
          
            if (client?.connected) {
              client.publish(controlTopic, alarmOffPayload, {}, (err) => {
                if (err) {
                  console.error(`❌ Failed to publish ALARM_OFF to ${controlTopic}:`, err);
                } else {
                  console.log(`🔕 ALARM_OFF sent to ${controlTopic}`);
                }
              });
            }
          };
        
          // Coba kirim sekarang + ulangi dalam 2 dan 5 detik (jika ESP reconnect)
          publishAlarmOff();
          setTimeout(publishAlarmOff, 2000);
          setTimeout(publishAlarmOff, 5000);
        }        
    
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
