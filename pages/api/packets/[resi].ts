// pages/api/packets/[resi].ts
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { resi } = req.query;

  if (req.method === "GET") {
    try {
      const packet = await prisma.packet.findUnique({
        where: { resi: String(resi) },
      });
      if (!packet) {
        return res.status(404).json({ status: "error", message: "Paket tidak ditemukan" });
      }
      return res.status(200).json({ status: "success", data: packet });
    } catch (error) {
      console.error("Error fetching packet:", error);
      return res.status(500).json({ status: "error", message: "Gagal mengambil data paket" });
    }
  } else if (req.method === "PUT") {
    const { resi: newResi, customer_name, address, order, device_id } = req.body;
    try {
      // Cek apakah paket dengan resi lama ada
      const existingPacket = await prisma.packet.findUnique({
        where: { resi: String(resi) },
      });
      if (!existingPacket) {
        return res.status(404).json({ status: "error", message: "Paket tidak ditemukan" });
      }

      // Cek apakah resi baru sudah ada (jika diberikan dan berubah)
      if (newResi && newResi !== String(resi)) {
        const duplicatePacket = await prisma.packet.findUnique({
          where: { resi: newResi },
        });
        if (duplicatePacket) {
          return res.status(409).json({ status: "error", message: "Resi sudah digunakan" });
        }
      }

      // Validasi field yang diberikan tidak kosong
      if (newResi?.trim() === "") {
        return res.status(400).json({ status: "error", message: "Resi tidak boleh kosong" });
      }
      if (customer_name?.trim() === "") {
        return res.status(400).json({ status: "error", message: "Nama pelanggan tidak boleh kosong" });
      }
      if (address?.trim() === "") {
        return res.status(400).json({ status: "error", message: "Alamat tidak boleh kosong" });
      }
      if (order?.trim() === "") {
        return res.status(400).json({ status: "error", message: "Order tidak boleh kosong" });
      }

      // Siapkan data untuk update, gunakan nilai lama jika field tidak diberikan
      const updateData = {
        resi: newResi ?? existingPacket.resi,
        customer_name: customer_name ?? existingPacket.customer_name,
        address: address ?? existingPacket.address,
        order: order ?? existingPacket.order,
        device_id: device_id !== undefined ? device_id : existingPacket.device_id,
      };

      // Update paket
      const packet = await prisma.packet.update({
        where: { resi: String(resi) },
        data: updateData,
      });
      console.log(`Updated packet: ${resi} -> ${packet.resi}`);
      return res.status(200).json({ status: "success", data: packet });
    } catch (error: any) {
      console.error("Error updating packet:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ status: "error", message: "Paket tidak ditemukan" });
      }
      if (error.code === "P2002") {
        return res.status(409).json({ status: "error", message: "Resi sudah digunakan" });
      }
      return res.status(500).json({ status: "error", message: "Gagal mengupdate paket" });
    }
  } else if (req.method === "DELETE") {
    try {
      const packet = await prisma.packet.findUnique({
        where: { resi: String(resi) },
      });
      if (!packet) {
        return res.status(404).json({ status: "error", message: "Paket tidak ditemukan" });
      }
      await prisma.packet.delete({
        where: { resi: String(resi) },
      });
      console.log(`Deleted packet with resi: ${resi}`);
      return res.status(200).json({ status: "success", message: "Paket berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting packet:", error);
      return res.status(500).json({ status: "error", message: "Gagal menghapus paket" });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).json({ status: "error", message: `Method ${req.method} tidak diizinkan` });
  }
}