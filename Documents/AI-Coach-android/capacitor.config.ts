import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coachonurai.com',
  appName: 'AI Coach',
  webDir: 'www',
  server: {
    hostname: 'coachonurai.com',
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  }
};

export default config;
