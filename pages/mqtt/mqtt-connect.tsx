// pages/mqtt/mqtt-connect.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Layout from '@/components/layouts/Layout';
import { useMqtt } from '@/contexts/MqttContext';
import { toast } from 'react-hot-toast';
import mqtt from 'mqtt';
import { connectMqtt, getMqttClient, stopMqttService, subscribeToTopic } from '@/libs/mqttService';

const MqttConnectPage = () => {
  const router = useRouter();
  const { client, setClient, isConnected, setIsConnected } = useMqtt();
  const [message, setMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    const mqttClient = getMqttClient();
    if (!mqttClient) return;

    const messageHandler = (topic: string, msg: Buffer) => {
      const messageText = msg.toString();
      setMessage(messageText);
      setLogs((prev) => [...prev, `📨 Message from '${topic}': ${messageText}`]);
    };

    mqttClient.on('message', messageHandler);
    return () => {
      mqttClient.off('message', messageHandler);
    };
  }, []);

  const handleConnect = () => {
    if (connecting || isConnected) return;

    setConnecting(true);
    setLogs((prev) => [...prev, '🔄 Connecting to MQTT broker...']);

    try {
      const mqttClient = connectMqtt();

      mqttClient.on('connect', () => {
        setLogs((prev) => [...prev, '✅ Connected to MQTT broker']);
        subscribeToTopic('parcela/+/control', (err) => {
          if (!err) {
            setLogs((prev) => [...prev, "📡 Successfully subscribed to 'parcela/+/control'"]);
          } else {
            setLogs((prev) => [...prev, "⚠️ Failed to subscribe to 'parcela/+/control'"]);
          }
        });
        setClient(mqttClient);
        setIsConnected(true);
        setConnecting(false);
        toast.success('Connected to MQTT broker');
      });

      mqttClient.on('error', (error) => {
        console.error('MQTT Error:', error);
        setLogs((prev) => [...prev, `❌ MQTT Error: ${error.message}`]);
        setConnecting(false);
        toast.error('Failed to connect to MQTT broker');
      });

      mqttClient.on('close', () => {
        setLogs((prev) => [...prev, '🔌 MQTT connection closed']);
        setIsConnected(false);
        setConnecting(false);
      });
    } catch (error: any) {
      console.error('MQTT Connection Error:', error);
      setLogs((prev) => [...prev, `❌ MQTT Connection Error: ${error.message}`]);
      setConnecting(false);
      toast.error('Failed to connect to MQTT broker');
    }
  };

  const handleDisconnect = () => {
    stopMqttService();
    setLogs((prev) => [...prev, '🔌 MQTT connection manually disconnected']);
    setClient(null);
    setIsConnected(false);
    toast.success('Disconnected from MQTT broker');
  };

  return (
    <Layout>
      <div className="w-full max-w-xl mx-auto py-20 text-black">
        <div className="flex items-center mb-6 justify-between">
          <div className="flex items-center">
            <button onClick={handleBack} className="mr-4" aria-label="Back">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-lg font-semibold text-gray-700">MQTT Connect</h2>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">MQTT Connection Status</h3>
          <p className="text-sm text-gray-500">
            MQTT connection status: {isConnected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
          </p>

          <div className="flex gap-4 mt-4">
            <button
              onClick={handleConnect}
              disabled={connecting || isConnected}
              className={`px-4 py-2 rounded text-white ${
                connecting || isConnected ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {connecting ? 'Connecting...' : 'Try to Connect'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              className={`px-4 py-2 rounded text-white ${
                !isConnected ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Disconnect
            </button>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700">Latest Message:</h4>
            <p className="text-sm text-gray-500">{message || 'No message received.'}</p>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Terminal Log:</h4>
            <div className="bg-black text-green-400 p-3 rounded-md h-48 overflow-y-auto text-sm font-mono shadow-inner">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet.</p>
              ) : (
                logs.map((log, idx) => <div key={idx}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MqttConnectPage;