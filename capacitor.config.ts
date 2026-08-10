import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.md.flixit',
  appName: 'Flixit',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Development URL (Run 'npm run dev' and use your local IP)
    // url: 'http://192.168.1.XX:3000' 
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000"
    }
  }
};

export default config;
