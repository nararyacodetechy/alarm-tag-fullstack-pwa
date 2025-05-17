// pages/api/packets/total.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const total = await prisma.packet.count();
      // Nonaktifkan caching
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.status(200).json({ status: "success", total });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Gagal mengambil total paket" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ status: "error", message: `Method ${req.method} tidak diizinkan` });
  }
}