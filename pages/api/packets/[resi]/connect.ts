// pages/api/packets/[resi]/connect.ts
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { resi } = req.query;
  const { device_id } = req.body;

  if (req.method === 'PUT') {
    try {
      // Cek apakah device_id sudah digunakan
      const existingPacket = await prisma.packet.findFirst({
        where: { device_id, NOT: { resi: String(resi) } },
      });
      if (existingPacket) {
        return res.status(400).json({ status: 'error', message: 'Device ID sudah digunakan oleh paket lain' });
      }

      const packet = await prisma.packet.update({
        where: { resi: String(resi) },
        data: { device_id },
      });
      return res.status(200).json({ status: 'success', data: packet });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: 'Gagal menghubungkan device' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
  }
}