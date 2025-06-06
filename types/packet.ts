import { Device } from "./device";

// types/packet.ts
export type Packet = {
  id: number;
  resi: string;
  customer_name: string;
  address: string;
  order: string;
  device_id: string | null;
  status?: string;
  device?: Device | null; // Add device relation
};
  
  