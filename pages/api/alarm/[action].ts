// pages/api/alarm/[action].ts
import mqtt from 'mqtt';
import { NextApiRequest, NextApiResponse } from 'next';
import { connectMqtt } from '@/libs/mqttService';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const validActions = ['on', 'off', 'reset'] as const;
type Action = (typeof validActions)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, resi } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
  }

  if (!resi || typeof resi !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Resi tidak valid' });
  }

  if (!action || typeof action !== 'string' || !validActions.includes(action as Action)) {
    return res.status(400).json({ status: 'error', message: 'Aksi tidak valid' });
  }

  try {
    const mqttClient = connectMqtt();

    // Handle MQTT connection with timeout
    const connectionTimeout = setTimeout(() => {
      mqttClient.end();
      res.status(504).json({ status: 'error', message: 'Timeout menghubungkan ke broker MQTT' });
    }, 10000); // 10 seconds timeout

    if (!mqttClient.connected) {
      mqttClient.on('connect', async () => {
        clearTimeout(connectionTimeout);
        await handlePublish(mqttClient, resi, action as Action, res);
      });

      mqttClient.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('MQTT Error:', error);
        res.status(500).json({ status: 'error', message: 'Gagal menghubungkan ke broker MQTT' });
      });
    } else {
      clearTimeout(connectionTimeout);
      await handlePublish(mqttClient, resi, action as Action, res);
    }
  } catch (error: any) {
    console.error('Error in API handler:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Gagal memproses perintah' });
  }
}

async function handlePublish(mqttClient: mqtt.MqttClient, resi: string, action: Action, res: NextApiResponse) {
  try {
    const packet = await prisma.packet.findUnique({
      where: { resi },
    });

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
      return res.status(200).json({ status: 'success', message: `Perintah ${action} berhasil dikirim` });
    });
  } catch (error: any) {
    console.error('Error in handlePublish:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal memproses perintah' });
  }
}