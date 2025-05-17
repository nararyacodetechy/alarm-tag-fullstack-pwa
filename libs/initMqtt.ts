// libs/initMqtt.ts
import { startMqttService } from './mqttService';

let started = false;

export const initializeMqtt = () => {
  if (!started) {
    startMqttService();
    console.log('🚀 MQTT initialized from server');
    started = true; // pastikan hanya dijalankan sekali
  }
};