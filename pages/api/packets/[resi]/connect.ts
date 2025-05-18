// pages/api/packets/[resi]/connect.ts

import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { getMqttClient, connectMqtt } from '@/libs/mqttService';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { resi } = req.query;
  const { device_id } = req.body;

  if (req.method === 'PUT') {
    const startTime = Date.now();
    console.log(`[CONNECT API] Starting connect for resi: ${resi}, device_id: ${device_id} at ${new Date().toISOString()}`);

    try {
      // Cek apakah device_id sudah digunakan
      const dbCheckStart = Date.now();
      const existingPacket = await prisma.packet.findFirst({
        where: { device_id, NOT: { resi: String(resi) } },
      });
      console.log(`[CONNECT API] Database check took ${Date.now() - dbCheckStart}ms`);

      if (existingPacket) {
        return res.status(400).json({ status: 'error', message: 'Device ID sudah digunakan oleh paket lain' });
      }

      // Kirim perintah CONFIRM_CONNECTED ke perangkat
      const mqttStart = Date.now();
      const mqttClient = getMqttClient() ?? connectMqtt();
      if (!mqttClient.connected) {
        console.log('[CONNECT API] MQTT client not connected, attempting to reconnect...');
        mqttClient.reconnect();
        await new Promise<void | void>((resolve) => {
          mqttClient.once('connect', () => {
            console.log('[CONNECT API] MQTT client reconnected successfully');
            resolve();
          });
          mqttClient.once('error', (error) => {
            console.error('[CONNECT API] MQTT reconnect error:', error);
            resolve(); // Lanjutkan meskipun gagal reconnect
          });
          setTimeout(() => {
            console.warn('[CONNECT API] MQTT reconnect timeout');
            resolve();
          }, 5000);
        });
      }

      if (mqttClient.connected) {
        const controlTopic = `parcela/${device_id}/control`;
        const confirmPayload = 'CONFIRM_CONNECTED';
        mqttClient.publish(controlTopic, confirmPayload, { qos: 1 }, (err) => {
          if (err) {
            console.error(`❌ Failed to publish CONFIRM_CONNECTED to ${controlTopic}:`, err);
          } else {
            console.log(`✅ CONFIRM_CONNECTED sent to ${controlTopic} in ${Date.now() - mqttStart}ms`);
          }
        });
      } else {
        console.warn('⚠️ MQTT client not connected, CONFIRM_CONNECTED not sent');
      }

      // Hubungkan perangkat ke paket
      const dbUpdateStart = Date.now();
      const packet = await prisma.packet.update({
        where: { resi: String(resi) },
        data: { device_id },
      });
      console.log(`[CONNECT API] Database update took ${Date.now() - dbUpdateStart}ms`);

      console.log(`[CONNECT API] Completed in ${Date.now() - startTime}ms`);
      return res.status(200).json({ status: 'success', data: packet });
    } catch (error) {
      console.error('[CONNECT API] Error in connect:', error);
      return res.status(500).json({ status: 'error', message: 'Gagal menghubungkan device' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
  }
}