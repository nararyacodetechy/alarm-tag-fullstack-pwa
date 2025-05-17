// pages/api/packets/[resi]/disconnect.ts
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { resi } = req.query;

  if (req.method === 'PUT') {
    try {
      const packet = await prisma.packet.update({
        where: { resi: String(resi) },
        data: { device_id: null },
      });
      return res.status(200).json({ status: 'success', data: packet });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: 'Gagal memutuskan device' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
  }
}