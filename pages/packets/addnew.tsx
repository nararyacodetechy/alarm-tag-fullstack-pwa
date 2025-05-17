// pages/packets/addnew.tsx
import { useState } from "react";
import Layout from "@/components/layouts/Layout";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { createPacket } from "@/libs/packetService";

export default function AddNewPacket() {
  const router = useRouter();
  const [resi, setResi] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [order, setOrder] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Cegah double submit

    if (!resi || !customerName || !address || !order) {
      setError("Semua kolom harus diisi");
      return;
    }

    try {
      setIsSubmitting(true);
      await createPacket({
        resi,
        customer_name: customerName,
        address,
        order,
      });
    
      toast.success("Paket berhasil ditambahkan!");
    
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      toast.error("Gagal menambahkan paket.");
      setIsSubmitting(false); 
    }    
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <Layout>
      <div className="w-full max-w-lg mx-auto h-[100vh] flex flex-col">
        <Toaster position="top-right" reverseOrder={false} />

        {/* Header Sticky */}
        <div className="sticky top-0 bg-white z-10 pt-20 pb-4">
          <div className="flex items-center mb-2 justify-between">
            <div className="flex items-center">
              <button onClick={handleBack} className="mr-4" aria-label="Kembali">
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h2 className="text-lg font-semibold text-gray-700">Add New Packet</h2>
            </div>
          </div>

          {error && <div className="text-red-600 text-center">{error}</div>}
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pb-16">
          <form onSubmit={handleSubmit} className="space-y-4 bg-white text-black">
            <div>
              <label className="block font-medium mb-2">Receipt Number</label>
              <input
                type="text"
                value={resi}
                onChange={(e) => setResi(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Add Unique Receipt Number"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Add New Customer Name"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Add Customer Address"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Orders</label>
              <input
                type="text"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Add Customer Orders"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white py-3 rounded-lg ${
                isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-gray-500 hover:bg-gray-400"
              }`}
            >
              {isSubmitting ? "Saving..." : "Add New Packet"}
            </button>
          </form>
        </div>
      </div>
    </Layout>

  );
}
