import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trihonor.bikefitai',
  appName: 'BikeFit AI',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    // Allow cleartext traffic to Pi 5 during development (remove for production)
    allowMixedContent: false,
    // Target SDK
    minWebViewVersion: 89,
  },
  server: {
    // PRODUCTION: serve from our own live URL so API calls go through Nginx
    // The Android WebView loads the app from local assets,
    // but API calls go to the live production backend.
    hostname: 'bikefit.coachonurai.com',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#07080f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    CapacitorBleClient: {
      // displayStrings declared in native layer
    },
  },
};

export default config;
