// // pages/api/packets/[resi]/disconnect.ts

// import { PrismaClient } from '@prisma/client';
// import { NextApiRequest, NextApiResponse } from 'next';

// const prisma = new PrismaClient();

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const { resi } = req.query;

//   if (req.method === 'PUT') {
//     try {
//       const packet = await prisma.packet.update({
//         where: { resi: String(resi) },
//         data: { device_id: null },
//       });
//       return res.status(200).json({ status: 'success', data: packet });
//     } catch (error) {
//       return res.status(500).json({ status: 'error', message: 'Gagal memutuskan device' });
//     }
//   } else {
//     res.setHeader('Allow', ['PUT']);
//     return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
//   }
// }

import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { getMqttClient, connectMqtt } from '@/libs/mqttService';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { resi } = req.query;

  if (req.method === 'PUT') {
    try {
      // Cek apakah paket ada dan memiliki device_id
      const packet = await prisma.packet.findUnique({
        where: { resi: String(resi) },
      });
      if (!packet) {
        return res.status(404).json({ status: 'error', message: 'Paket tidak ditemukan' });
      }
      if (!packet.device_id) {
        return res.status(400).json({ status: 'error', message: 'Paket tidak memiliki perangkat yang terhubung' });
      }

      // Kirim perintah DISCONNECT ke perangkat
      const mqttClient = getMqttClient() ?? connectMqtt();
      if (mqttClient.connected) {
        const controlTopic = `parcela/${packet.device_id}/control`;
        const disconnectPayload = 'DISCONNECT';
        mqttClient.publish(controlTopic, disconnectPayload, { qos: 1 }, (err) => {
          if (err) {
            console.error(`❌ Failed to publish DISCONNECT to ${controlTopic}:`, err);
          } else {
            console.log(`✅ DISCONNECT sent to ${controlTopic}`);
          }
        });
      } else {
        console.warn('⚠️ MQTT client not connected, DISCONNECT not sent');
      }

      // Putuskan perangkat dari paket
      const updatedPacket = await prisma.packet.update({
        where: { resi: String(resi) },
        data: { device_id: null },
      });

      return res.status(200).json({ status: 'success', data: updatedPacket });
    } catch (error) {
      console.error('Error in disconnect:', error);
      return res.status(500).json({ status: 'error', message: 'Gagal memutuskan device' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
  }
}