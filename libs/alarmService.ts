// libs/alarmService.ts
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
}

// Define the expected API response type
export type AlarmResponse = {
  status: 'success' | 'error';
  message: string;
};

// Helper function to handle fetch requests
const fetchAlarmAction = async (resi: string, action: 'on' | 'off' | 'reset', retries = 3): Promise<AlarmResponse> => {
  let attempts = 0;
  while (attempts < retries) {
    attempts++;
    console.log(`[ALARM SERVICE] Attempt ${attempts} for action: ${action} on resi: ${resi}`);

    try {
      const response = await fetch(`${API_URL}/alarm/${action}?resi=${resi}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000), // Timeout 10 detik per request
      });

      const data: AlarmResponse = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || `Failed to perform ${action} action`);
      }

      console.log(`[ALARM SERVICE] Success for action: ${action} on resi: ${resi}`);
      return data;
    } catch (error: any) {
      console.error(`[ALARM SERVICE] Error in attempt ${attempts} for ${action} on resi: ${resi}:`, error);
      if (attempts < retries) {
        console.log(`[ALARM SERVICE] Retrying in 1 second...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw new Error(error.message || `Failed to perform ${action} action after ${retries} attempts`);
      }
    }
  }
  throw new Error(`Failed to perform ${action} action after ${retries} attempts`);
};

export const turnOn = (resi: string) => fetchAlarmAction(resi, 'on');
export const turnOff = (resi: string) => fetchAlarmAction(resi, 'off');
export const resetAlarm = (resi: string) => fetchAlarmAction(resi, 'reset');