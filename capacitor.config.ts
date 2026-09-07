import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.krazel.sopaletras3d',
  appName: 'Sopa de letras 3D',
  webDir: 'dist/client',
  backgroundColor: '#0b1120',
  ios: {
    zoomEnabled: false,
    contentInset: 'never',
    backgroundColor: '#0b1120',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
};

export default config;
