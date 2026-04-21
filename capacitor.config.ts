import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luxai.app',
  appName: 'Privé',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
