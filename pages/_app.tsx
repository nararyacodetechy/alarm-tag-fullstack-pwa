// pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { MqttProvider } from "../contexts/MqttContext"; // pastikan path benar

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MqttProvider>
      <Component {...pageProps} />
    </MqttProvider>
  );
}
