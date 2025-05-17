// contexts/MqttContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { MqttClient } from 'mqtt';
import { connectMqtt, stopMqttService } from '@/libs/mqttService';

interface MqttContextProps {
  client: MqttClient | null;
  setClient: React.Dispatch<React.SetStateAction<MqttClient | null>>;
  isConnected: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
}

const MqttContext = createContext<MqttContextProps>({
  client: null,
  setClient: () => {},
  isConnected: false,
  setIsConnected: () => {},
});

export const MqttProvider = ({ children }: { children: React.ReactNode }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<MqttClient | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (clientRef.current) {
      console.log('MQTT: Client already initialized');
      return;
    }

    try {
      console.log('MQTT: Initializing client');
      const mqttClient = connectMqtt();
      clientRef.current = mqttClient;

      mqttClient.on('connect', () => {
        console.log('✅ MQTT: Connected to broker');
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset reconnect attempts
      });

      mqttClient.on('error', (error) => {
        console.error('❌ MQTT: Error:', error.message);
        setIsConnected(false);
      });

      mqttClient.on('close', () => {
        console.log('🔌 MQTT: Connection closed');
        setIsConnected(false);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`MQTT: Attempting to reconnect (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          reconnectAttempts.current += 1;
        } else {
          console.log('MQTT: Max reconnect attempts reached');
        }
      });

      setClient(mqttClient);

      return () => {
        console.log('MQTT: Cleaning up client');
        if (clientRef.current) {
          stopMqttService();
          clientRef.current = null;
        }
      };
    } catch (error) {
      console.error('❌ MQTT: Failed to initialize client:', error);
      setIsConnected(false);
    }
  }, []);

  return (
    <MqttContext.Provider value={{ client, setClient, isConnected, setIsConnected }}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => useContext(MqttContext);