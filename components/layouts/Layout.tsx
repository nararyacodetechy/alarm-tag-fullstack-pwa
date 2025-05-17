// components/layouts/Layout.tsx
'use client';

import React from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMqtt } from "@/contexts/MqttContext";
import { appVersion } from "@/libs/version";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isConnected } = useMqtt();

  const goToMqttSettings = () => {
    router.push("/mqtt/mqtt-connect");
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-black overflow-hidden">
      <header className="fixed top-0 left-0 right-0 bg-gray-900 text-white py-4 shadow-md px-6 flex items-center justify-between z-50">
        <h1 className="text-xl font-semibold">Alarm Tag</h1>
        <button onClick={goToMqttSettings} aria-label="MQTT Settings" className="ml-4">
          {isConnected ? (
            <Wifi className="w-6 h-6 text-white hover:text-gray-200 cursor-pointer" />
          ) : (
            <WifiOff className="w-6 h-6 text-white hover:text-gray-200 cursor-pointer" />
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4">
        {children}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 text-center py-3 text-white bg-gray-900 z-50">
        App Versi: {appVersion}
      </footer>
    </div>
  );
}
