// pages/api/alarm/[action].ts
import mqtt from 'mqtt';
import { NextApiRequest, NextApiResponse } from 'next';
import { connectMqtt, getMqttClient } from '@/libs/mqttService';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const validActions = ['on', 'off', 'reset'] as const;
type Action = (typeof validActions)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, resi } = req.query;
  const startTime = Date.now();
  console.log(`[ALARM API] Starting action: ${action} for resi: ${resi} at ${new Date().toISOString()}`);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} not allowed` });
  }

  if (!resi || typeof resi !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Invalid resi' });
  }

  if (!action || typeof action !== 'string' || !validActions.includes(action as Action)) {
    return res.status(400).json({ status: 'error', message: 'Invalid action' });
  }

  try {
    const mqttClient = getMqttClient() ?? connectMqtt();

    // Cek status perangkat di database
    const packetCheckStart = Date.now();
    const packet = await prisma.packet.findUnique({
      where: { resi },
      include: { device: true }, // Sertakan data device
    });
    console.log(`[ALARM API] Packet check took ${Date.now() - packetCheckStart}ms`);

    if (!packet || !packet.device_id) {
      return res.status(400).json({ status: 'error', message: 'Packet has no connected device' });
    }

    if (!packet.device || packet.device.status !== 'online') {
      console.warn(`[ALARM API] Device ${packet.device_id} is offline or not found`);
      return res.status(400).json({ status: 'error', message: 'Device is offline or not found' });
    }

    // Fungsi untuk mencoba publish dengan retry
    const publishWithRetry = async (topic: string, message: string, retries = 3): Promise<void> => {
      let attempts = 0;
      while (attempts < retries) {
        attempts++;
        console.log(`[ALARM API] Attempt ${attempts} to publish ${message} to ${topic}`);

        if (!mqttClient.connected) {
          console.log('[ALARM API] MQTT client not connected, attempting to reconnect...');
          mqttClient.reconnect();
          await new Promise((resolve) => {
            mqttClient.once('connect', () => {
              console.log('[ALARM API] MQTT client reconnected successfully');
              resolve(true);
            });
            mqttClient.once('error', (error) => {
              console.error('[ALARM API] MQTT reconnect error:', error);
              resolve(false);
            });
            setTimeout(() => {
              console.warn('[ALARM API] MQTT reconnect timeout');
              resolve(false);
            }, 3000); // Timeout reconnect 3 detik
          });
        }

        if (mqttClient.connected) {
          return new Promise((resolve, reject) => {
            mqttClient.publish(topic, message, { qos: 1 }, (err) => {
              if (err) {
                console.error(`[ALARM API] Failed to publish ${message} to ${topic}:`, err);
                reject(err);
              } else {
                console.log(`[ALARM API] Published "${message}" to topic: ${topic} in ${Date.now() - startTime}ms`);
                resolve();
              }
            });
          });
        }

        if (attempts < retries) {
          console.log(`[ALARM API] Retrying in 1 second...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      throw new Error(`Failed to publish ${message} after ${retries} attempts`);
    };

    // Publish perintah alarm
    const mqttStart = Date.now();
    const topic = `parcela/${packet.device_id}/control`;
    let message: string;

    switch (action) {
      case 'on':
        message = 'ALARM_ON';
        break;
      case 'off':
        message = 'ALARM_OFF';
        break;
      case 'reset':
        message = 'ALARM_OFF';
        break;
      default:
        return res.status(400).json({ status: 'error', message: 'Invalid action' });
    }

    await publishWithRetry(topic, message);
    console.log(`[ALARM API] Completed in ${Date.now() - startTime}ms`);
    return res.status(200).json({ status: 'success', message: `Command ${action} successfully sent` });
  } catch (error: any) {
    console.error('[ALARM API] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to process command' });
  }
}

async function handlePublish(mqttClient: mqtt.MqttClient, resi: string, action: Action, res: NextApiResponse) {
  try {
    const packet = await prisma.packet.findUnique({
      where: { resi },
    });

    if (!mqttClient.connected) {
      return res.status(503).json({ status: 'error', message: 'MQTT broker belum siap' });
    }    

    if (!packet || !packet.device_id) {
      return res.status(400).json({ status: 'error', message: 'Paket tidak memiliki device yang terhubung' });
    }

    const topic = `parcela/${packet.device_id}/control`;
    let message: string;

    switch (action) {
      case 'on':
        message = 'ALARM_ON';
        break;
      case 'off':
        message = 'ALARM_OFF';
        break;
      case 'reset':
        message = 'ALARM_OFF';
        break;
      default:
        return res.status(400).json({ status: 'error', message: 'Aksi tidak valid' });
    }

    mqttClient.publish(topic, message, (err) => {
      if (err) {
        console.error('Publish Error:', err);
        return res.status(500).json({ status: 'error', message: 'Gagal mengirim perintah ke device' });
      }
      console.log(`✅ Published "${message}" to topic: ${topic}`);
      return res.status(200).json({ status: 'success', message: `Perintah ${action} berhasil dikirim` });
    });
    
  } catch (error: any) {
    console.error('Error in handlePublish:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal memproses perintah' });
  }
}