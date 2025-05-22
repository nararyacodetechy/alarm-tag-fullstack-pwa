// pages/api/devices/available.ts
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Ambil device_id yang sudah digunakan oleh packet
      const usedDeviceIds = await prisma.packet.findMany({
        where: { device_id: { not: null } },
        select: { device_id: true },
      });
      const usedIds = usedDeviceIds.map((packet: { device_id: string | null }) => packet.device_id);

      const availableDevices = await prisma.device.findMany({
        where: {
          status: "online",
          device_id: { notIn: usedIds as string[] },
        },
        select: {
          device_id: true,
          last_seen: true,
        },
      });
      

      return res.status(200).json({ status: "success", data: availableDevices });
    } catch (error) {
      console.error("Error fetching available devices:", error);
      return res.status(500).json({ status: "error", message: "Gagal mengambil daftar perangkat" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ status: "error", message: `Method ${req.method} tidak diizinkan` });
  }
}
