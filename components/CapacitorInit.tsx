'use client';

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export default function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Initialize Status Bar
    const initStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
      } catch (err) {
        console.warn('StatusBar init error:', err);
      }
    };

    // Handle Hardware Back Button
    const initBackButton = () => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    };

    // Hide Splash Screen
    const hideSplashScreen = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('SplashScreen hide error:', err);
      }
    };

    initStatusBar();
    initBackButton();
    hideSplashScreen();

    return () => {
      App.removeAllListeners();
    };
  }, [router]);

  return null;
}
