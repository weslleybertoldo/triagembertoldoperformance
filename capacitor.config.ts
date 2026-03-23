import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.bertoldo.triagem',
  appName: 'Team Bertoldo',
  webDir: 'dist',
  android: { webContentsDebuggingEnabled: false, allowMixedContent: true },
  server: { cleartext: true, androidScheme: 'https' },
};
export default config;
