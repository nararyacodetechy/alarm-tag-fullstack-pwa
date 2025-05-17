// pages/api/mqtt/_mqtt.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { startMqttService } from '@/libs/mqttService';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      startMqttService();
      res.status(200).json({ status: 'success', message: 'MQTT service started' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Failed to start MQTT service' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ status: 'error', message: `Method ${req.method} not allowed` });
  }
}