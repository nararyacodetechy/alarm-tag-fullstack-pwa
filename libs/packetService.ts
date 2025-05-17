// libs/packetService.ts
import { Device } from "@/types/device";
import { Packet } from "@/types/packet";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const getAllPackets = async (): Promise<Packet[]> => {
  try {
    const res = await fetch(`${API_URL}/packets`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', // Tambahkan ini!
    });
    
    const data = await res.json();
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Gagal mengambil daftar paket');
    }
    return data.data;
  } catch (error) {
    console.error('Error in getAllPackets:', error);
    throw error;
  }
};

export const getPacketByResi = async (resiId: string) => {
  try {
    const res = await fetch(`${API_URL}/packets/${resiId}`, {
      cache: "no-store", // Nonaktifkan caching
    });
    const data = await res.json();

    if (!res.ok || data.status !== "success") {
      console.error("API response for getPacketByResi:", data); // Log respons
      throw new Error(data.message || "Gagal memuat data paket");
    }

    return data.data;
  } catch (error) {
    console.error("Error in getPacketByResi:", error);
    throw error;
  }
};

export const getTotalPackets = async (): Promise<number> => {
  try {
    const res = await fetch(`${API_URL}/packets/total`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store", // Nonaktifkan caching di sisi klien
    });
    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      console.error("API response:", data); // Log respons untuk debugging
      throw new Error(data.message || "Gagal mengambil data total paket");
    }
    return data.total;
  } catch (error) {
    console.error("Error in getTotalPackets:", error);
    throw error;
  }
};

export const createPacket = async ({
  resi,
  customer_name,
  address,
  order,
}: {
  resi: string;
  customer_name: string;
  address: string;
  order: string;
}) => {
  const res = await fetch(`${API_URL}/packets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resi, customer_name, address, order }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Gagal menambahkan paket');
  }

  return res.json();
};

export const updatePacket = async (data: {
  oldResi: string; // Resi lama untuk URL
  resi: string; // Resi baru untuk update
  customer_name: string;
  address: string;
  order: string;
  device_id?: string | null;
}) => {
  try {
    const res = await fetch(`${API_URL}/packets/${data.oldResi}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resi: data.resi,
        customer_name: data.customer_name,
        address: data.address,
        order: data.order,
        device_id: data.device_id,
      }),
      cache: "no-store",
    });
    const responseData = await res.json();

    if (!res.ok || responseData.status !== "success") {
      console.error("API response for updatePacket:", responseData);
      throw new Error(responseData.message || "Gagal mengupdate paket");
    }

    return responseData.data;
  } catch (error) {
    console.error("Error in updatePacket:", error);
    throw error;
  }
};

export const deletePacket = async (resi: string) => {
  const res = await fetch(`${API_URL}/packets/${resi}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Gagal menghapus paket");
  }

  return res;
};

export const getAvailableDevices = async (): Promise<Device[]> => {
  try {
    const res = await fetch(`${API_URL}/devices/available`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok || data.status !== "success") {
      console.error("API response for getAvailableDevices:", data);
      throw new Error(data.message || "Gagal mengambil daftar perangkat yang tersedia");
    }

    return data.data;
  } catch (error) {
    console.error("Error in getAvailableDevices:", error);
    throw error;
  }
};

export const connectDevice = async (resi: string, device_id: string) => {
  const res = await fetch(`${API_URL}/packets/${resi}/connect`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Gagal menghubungkan device');
  }

  return res.json();
};

export const disconnectDevice = async (resi: string) => {
  const res = await fetch(`${API_URL}/packets/${resi}/disconnect`, {
    method: 'PUT',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Gagal memutuskan device');
  }

  return res.json();
};