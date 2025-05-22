// types/device.ts
export type Device = {
  device_id: string;
  last_seen: Date; // Ubah dari string ke Date
  status: string;
  id?: number; // Opsional, tambahkan jika diperlukan di frontend
  created_at?: Date; // Opsional
  updated_at?: Date; // Opsional
};