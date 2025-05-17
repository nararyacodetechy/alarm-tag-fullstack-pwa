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
const fetchAlarmAction = async (resi: string, action: 'on' | 'off' | 'reset'): Promise<AlarmResponse> => {
  try {
    const response = await fetch(`${API_URL}/alarm/${action}?resi=${resi}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data: AlarmResponse = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || `Failed to perform ${action} action`);
    }

    return data;
  } catch (error: any) {
    console.error(`Error in ${action} alarm action:`, error);
    throw new Error(error.message || `Failed to perform ${action} action`);
  }
};

export const turnOn = (resi: string) => fetchAlarmAction(resi, 'on');
export const turnOff = (resi: string) => fetchAlarmAction(resi, 'off');
export const resetAlarm = (resi: string) => fetchAlarmAction(resi, 'reset');