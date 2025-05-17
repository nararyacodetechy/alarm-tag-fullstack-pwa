import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { initializeMqtt } from '@/libs/initMqtt'; // ✅ tambahkan ini

const prisma = new PrismaClient();

initializeMqtt(); // ✅ inisialisasi service MQTT

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const packets = await prisma.packet.findMany();
      return res.status(200).json({ status: 'success', data: packets });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: 'Gagal mengambil data paket' });
    }
  } else if (req.method === 'POST') {
    const { resi, customer_name, address, order } = req.body;
    if (!resi || !customer_name || !address || !order) {
      return res.status(400).json({ status: 'error', message: 'Semua kolom harus diisi' });
    }
    try {
      const packet = await prisma.packet.create({
        data: { resi, customer_name, address, order },
      });
      return res.status(201).json({ status: 'success', data: packet });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: 'Gagal menambahkan paket' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: `Method ${req.method} tidak diizinkan` });
  }
}
