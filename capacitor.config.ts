import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.kmproduction',
  appName: 'KM Production House',
  webDir: 'dist',
  server: {
    url: 'https://95bf00eb-4b09-49ba-a56d-1d63104b9736.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
