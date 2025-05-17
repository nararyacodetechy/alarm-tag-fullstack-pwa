// pages/index.tsx
'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layouts/Layout';
import { getAllPackets, getTotalPackets } from '@/libs/packetService';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { Packet } from '@/types/packet';

export default function Dashboard() {
  const [totalPackets, setTotalPackets] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [packets, setPackets] = useState<Packet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchPacketsData = async () => {
    setIsLoading(true);
    try {
      const packetsData = await getAllPackets();
      setPackets(packetsData);
    } catch (error: any) {
      console.error('Error fetching packets list:', error.message);
      toast.error(`Gagal mengambil daftar paket: ${error.message}`);
      setPackets([]);
    }

    try {
      const total = await getTotalPackets();
      setTotalPackets(total);
    } catch (error: any) {
      console.error('Error fetching total packets:', error.message);
      toast.error(`Gagal mengambil total paket: ${error.message}`);
      setTotalPackets(packets.length); // Fallback ke jumlah paket
    } finally {
      setIsLoading(false);
    }
  };

  // Memuat data saat pertama kali dimuat
  useEffect(() => {
    fetchPacketsData();
  }, []);

  // Refresh data saat pathname berubah
  useEffect(() => {
    fetchPacketsData();
  }, [pathname]);

  const filteredPackets = packets.filter(
    (packet) =>
      packet.resi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      packet.order.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetail = (resi: string) => {
    router.push(`/packets/${resi}`);
  };

  const handleAddPacket = () => {
    router.push('/packets/addnew');
  };

  return (
    <Layout>
      <div className="bg-white pt-20 pb-16 w-full max-w-6xl mx-auto text-black">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Dashboard Packet</h1>
          <div className="mt-2 text-lg">
            Total Packet: {isLoading ? 'Loading...' : totalPackets ?? 0}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 justify-between mb-6">
          <div className="w-full md:w-1/4">
            <button
              onClick={handleAddPacket}
              className="bg-gray-800 w-full p-3 hover:bg-gray-800 text-white rounded-lg text-sm"
            >
              Add New Packet
            </button>
          </div>
          <div className="w-full md:w-3/4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Packet (Receipt Number / Order)"
              className="w-full border p-2.5 border-gray-300 rounded-xl text-black"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p>Loading packets...</p>
          ) : filteredPackets.length === 0 ? (
            <p>No packets found.</p>
          ) : (
            filteredPackets.map((packet) => (
              <div
                key={packet.id}
                className="bg-white p-4 rounded-xl shadow-md border border-gray-200"
              >
                <h3 className="text-xl font-semibold">Recpt: {packet.resi}</h3>
                <p className="mt-2 text-gray-700">Orders: {packet.order}</p>
                <p className="mt-1 text-gray-500 text-sm">Customer Name: {packet.customer_name}</p>
                <p className="mt-1 text-gray-500 text-sm">Address: {packet.address}</p>
                <p className="mt-2 text-gray-600">Status: {packet.status ?? 'N/A'}</p>
                <p className="mt-2 text-gray-600">Device Id: {packet.device_id ?? 'N/A'}</p>
                <button
                  onClick={() => handleViewDetail(packet.resi)}
                  className="mt-4 border border-gray-700 text-black px-4 py-2 w-full rounded-lg text-sm"
                >
                  See Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}