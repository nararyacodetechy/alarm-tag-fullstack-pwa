// pages/packets/[resiId].tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/layouts/Layout';
import { useEffect, useState } from 'react';
import { Packet } from '@/types/packet';
import { Device } from '@/types/device';
import { ArrowLeft } from 'lucide-react';
import {
  updatePacket,
  deletePacket,
  getPacketByResi,
  disconnectDevice,
  connectDevice,
  getAvailableDevices,
} from '@/libs/packetService';
import { turnOn, turnOff, resetAlarm, AlarmResponse } from '@/libs/alarmService';
import { toast, Toaster } from 'react-hot-toast';

export default function PacketDetail() {
  const router = useRouter();
  const params = useParams();
  const resiId = params?.resiId as string | undefined; // Ambil resiId dari params
  const [packet, setPacket] = useState<Packet | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Unknown');
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [form, setForm] = useState({
    resi: '',
    customer_name: '',
    address: '',
    order: '',
    device_id: null as string | null,
  });

  useEffect(() => {
    if (!resiId || typeof resiId !== 'string') {
      setError('Invalid receipt number');
      setLoading(false);
      setIsLoadingDevices(false);
      return;
    }

    const fetchData = async () => {
      try {
        const data = await getPacketByResi(resiId);
        setPacket(data);
        setForm({
          resi: data.resi,
          customer_name: data.customer_name,
          address: data.address,
          order: data.order,
          device_id: data.device_id,
        });
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load packet details');
        toast.error(err.message || 'Failed to load packet details');
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailableDevices = async () => {
      try {
        setIsLoadingDevices(true);
        const devices = await getAvailableDevices();
        setAvailableDevices(devices);
        console.log('Available devices:', devices);
      } catch (err: any) {
        console.error('Error fetching available devices:', err);
        toast.error(`Failed to load available devices: ${err.message}`);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchData();
    fetchAvailableDevices();
  }, [resiId]);

  const handleRequest = async (cb: () => Promise<AlarmResponse>, successText: string) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      toast.loading('Processing...');
      const response = await cb();
      setStatus(successText);
      toast.dismiss();
      toast.success(response.message);
    } catch (error: any) {
      setStatus('Failed to perform action');
      toast.dismiss();
      toast.error(error.message || 'Failed to perform action');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!packet || isActionLoading) return;

    if (form.resi.trim() === '') {
      toast.error('Receipt number cannot be empty');
      return;
    }
    if (form.customer_name.trim() === '') {
      toast.error('Customer name cannot be empty');
      return;
    }
    if (form.address.trim() === '') {
      toast.error('Address cannot be empty');
      return;
    }
    if (form.order.trim() === '') {
      toast.error('Order cannot be empty');
      return;
    }

    setIsActionLoading(true);
    try {
      toast.loading('Updating packet...');
      const updatedPacket = await updatePacket({
        oldResi: packet.resi,
        resi: form.resi,
        customer_name: form.customer_name,
        address: form.address,
        order: form.order,
        device_id: packet.device_id,
      });
      toast.dismiss();
      toast.success('Packet successfully updated');

      setPacket(updatedPacket);
      setIsEditing(false);

      if (form.resi !== packet.resi) {
        console.log(`Navigating to new resi: ${form.resi}`);
        router.push(`/packets/${form.resi}`);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed to update packet: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!packet || isActionLoading) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this package?');
    if (!confirmDelete) return;

    setIsActionLoading(true);
    try {
      toast.loading('Deleting packet...');
      await deletePacket(packet.resi);
      toast.dismiss();
      toast.success('Packet successfully deleted');
      setIsNavigating(true);
      router.push('/');
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed to remove packet: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('on') || lowerStatus.includes('activated')) {
      return 'bg-green-100 text-green-700';
    } else if (lowerStatus.includes('off') || lowerStatus.includes('deactivated')) {
      return 'bg-red-100 text-red-700';
    } else {
      return 'bg-gray-200 text-gray-700';
    }
  };

  // const connectDeviceHandler = async () => {
  //   if (!packet || isActionLoading) return;

  //   if (availableDevices.length === 0) {
  //     toast.error('No available devices found');
  //     return;
  //   }

  //   const deviceId = selectedDevice || availableDevices[0].device_id;

  //   setIsActionLoading(true);
  //   try {
  //     toast.loading('Connecting device...');
  //     await connectDevice(packet.resi, deviceId);
  //     toast.dismiss();
  //     toast.success(`Device ${deviceId} connected to Rcpt: ${packet.resi}`);
  //     setPacket((prev) => (prev ? { ...prev, device_id: deviceId } : prev));
  //     setAvailableDevices(availableDevices.filter((device) => device.device_id !== deviceId));
  //     setSelectedDevice('');
  //   } catch (err: any) {
  //     toast.dismiss();
  //     toast.error(`Failed to connect device: ${err.message || 'Unknown error'}`);
  //   } finally {
  //     setIsActionLoading(false);
  //   }
  // };

  // const disconnectDeviceHandler = async () => {
  //   if (!packet || isActionLoading) return;

  //   setIsActionLoading(true);
  //   try {
  //     toast.loading('Disconnecting device...');
  //     await disconnectDevice(packet.resi);
  //     toast.dismiss();
  //     toast.success(`Device disconnected from Rspt ${packet.resi}`);
  //     const disconnectedDevice = { device_id: packet.device_id!, last_seen: new Date().toISOString() };
  //     setAvailableDevices([...availableDevices, disconnectedDevice]);
  //     setPacket((prev) => (prev ? { ...prev, device_id: null } : prev));
  //   } catch (err: any) {
  //     toast.dismiss();
  //     toast.error(`Failed to disconnect device: ${err.message || 'Unknown error'}`);
  //   } finally {
  //     setIsActionLoading(false);
  //   }
  // };

  const connectDeviceHandler = async () => {
    if (!packet || isActionLoading) return;
  
    if (availableDevices.length === 0) {
      toast.error('No available devices found');
      return;
    }
  
    const deviceId = selectedDevice || availableDevices[0].device_id;
  
    setIsActionLoading(true);
    try {
      toast.loading('Connecting device...');
      await connectDevice(packet.resi, deviceId);
      toast.dismiss();
      toast.success(`Device ${deviceId} connected to Rcpt: ${packet.resi}`);
      setPacket((prev) => (prev ? { ...prev, device_id: deviceId } : prev));
      setAvailableDevices(availableDevices.filter((device) => device.device_id !== deviceId));
      setSelectedDevice('');
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed to connect device: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  };
  
  const disconnectDeviceHandler = async () => {
    if (!packet || isActionLoading) return;
  
    setIsActionLoading(true);
    try {
      toast.loading('Disconnecting device...');
      await disconnectDevice(packet.resi);
      toast.dismiss();
      toast.success(`Device ${packet.device_id} disconnected from Rcpt ${packet.resi}`);
      const disconnectedDevice = { device_id: packet.device_id!, last_seen: new Date().toISOString() };
      setAvailableDevices([...availableDevices, disconnectedDevice]);
      setPacket((prev) => (prev ? { ...prev, device_id: null } : prev));
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed to disconnect device: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBack = () => {
    console.log('Navigating back to dashboard from resi:', resiId);
    router.push('/');
  };

  const handleRefreshDevices = async () => {
    if (isLoadingDevices || isActionLoading) return;
    await fetchAvailableDevices();
  };

  const fetchAvailableDevices = async () => {
    try {
      setIsLoadingDevices(true);
      const devices = await getAvailableDevices();
      setAvailableDevices(devices);
      console.log('Available devices:', devices);
    } catch (err: any) {
      console.error('Error fetching available devices:', err);
      toast.error(`Failed to load available devices: ${err.message}`);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-xl pt-16 pb-16 h-screen mx-auto text-black flex flex-col relative">
        <Toaster position="top-right" reverseOrder={false} />

        <div className="flex items-center justify-between mb-5 bg-white sticky top-0 z-10 py-4">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3"
              aria-label="Back to dashboard"
              disabled={isNavigating || isActionLoading}
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-lg font-semibold text-gray-700">Packet Details</h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-grow px-1 pb-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : error ? (
            <div className="text-red-600">❌ {error}</div>
          ) : !packet ? (
            <p>No packet found</p>
          ) : (
            <div className="bg-white space-y-6">
              <div>
                <h3 className="font-semibold text-lg DISEBABKAN OLEH">Packet Information</h3>
                {(['resi', 'customer_name', 'address', 'order'] as const).map((field) => {
                  const label =
                    field === 'resi'
                      ? 'Receipt Number'
                      : field.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={field} className="mt-2">
                      <label className="font-semibold">{label}:</label>
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form[field] ?? ''}
                          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                          disabled={isActionLoading}
                          aria-label={label}
                        />
                      ) : (
                        <p>{packet[field]}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-0 pb-6">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isActionLoading}
                      aria-label="Save changes"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setForm({
                          resi: packet.resi,
                          customer_name: packet.customer_name,
                          address: packet.address,
                          order: packet.order,
                          device_id: packet.device_id,
                        });
                        setIsEditing(false);
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isActionLoading}
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isActionLoading}
                    aria-label="Edit packet"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Device Actions</h3>
                  <button
                    onClick={handleRefreshDevices}
                    className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoadingDevices || isActionLoading}
                    aria-label="Refresh available devices"
                  >
                    Refresh Devices
                  </button>
                </div>
                {packet.device_id ? (
                  <div className="flex justify-between border border-green-500 rounded-md p-2">
                    <span className="text-green-800 font-medium flex flex-col">
                      <p>Device ID: </p>
                      <p className="italic">{packet.device_id}</p>
                    </span>
                    <div className="flex flex-col items-end text-green-800">
                      <p>Device ✔</p>
                      <p>Alarm ✔</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isLoadingDevices ? (
                      <p className="text-gray-500">Loading devices...</p>
                    ) : availableDevices.length > 0 ? (
                      <>
                        <p className="text-gray-500">Select a device to connect:</p>
                        <select
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedDevice}
                          onChange={(e) => setSelectedDevice(e.target.value)}
                          disabled={isActionLoading}
                          aria-label="Select device"
                        >
                          <option value="">Select a device</option>
                          {availableDevices.map((device) => (
                            <option key={device.device_id} value={device.device_id}>
                              {device.device_id} (Last seen:{' '}
                              {new Date(device.last_seen).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })})
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p className="text-gray-500">No available devices</p>
                    )}
                  </div>
                )}
                {packet.device_id ? (
                  <button
                    onClick={disconnectDeviceHandler}
                    className="w-full border border-orange-700 text-orange-700 p-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isActionLoading}
                    aria-label="Disconnect device"
                  >
                    Disconnect Device
                  </button>
                ) : (
                  <button
                    onClick={connectDeviceHandler}
                    className="w-full border border-blue-700 text-blue-700 p-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={availableDevices.length === 0 || isLoadingDevices || isActionLoading}
                    aria-label="Connect device"
                  >
                    Connect Device
                  </button>
                )}
              </div>

              {packet.device_id && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="font-semibold text-lg">Alarm Actions</h3>
                    <span className={`text-sm px-3 py-1 rounded-full ${getStatusClass(status)}`}>
                      {status}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRequest(() => turnOn(packet.resi), 'Alarm is turned on 🔊')}
                    className="w-full border border-green-700 text-green-700 p-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isActionLoading}
                    aria-label="Turn on alarm"
                  >
                    Turn On the Alarm
                  </button>
                  <button
                    onClick={() => handleRequest(() => turnOff(packet.resi), 'Alarm is turned off 🔕')}
                    className="w-full border border-red-700 text-red-700 p-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isActionLoading}
                    aria-label="Turn off alarm"
                  >
                    Turn Off the Alarm
                  </button>
                  <button
                    onClick={() => handleRequest(() => resetAlarm(packet.resi), 'Alarm has been reset 🔄')}
                    className="w-full border border-gray-700 text-gray-700 p-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isActionLoading}
                    aria-label="Reset alarm"
                  >
                    Reset Alarm
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleDelete}
          disabled={isNavigating || isActionLoading}
          className="w-full border bg-red-700 hover:bg-red-600 text-white p-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Delete packet"
        >
          Delete (Remove)
        </button>
      </div>
    </Layout>
  );
}