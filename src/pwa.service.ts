import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

export interface PWAPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: PWAPromptEvent | null = null;
  private isInstalled = new BehaviorSubject<boolean>(false);
  private isStandalone = new BehaviorSubject<boolean>(false);
  private isUpdateAvailable = new BehaviorSubject<boolean>(false);

  public isInstalled$ = this.isInstalled.asObservable();
  public isStandalone$ = this.isStandalone.asObservable();
  public isUpdateAvailable$ = this.isUpdateAvailable.asObservable();

  constructor() {
    this.checkPWAStatus();
    this.listenForInstallPrompt();
    this.listenForAppInstalled();
    this.listenForServiceWorkerUpdates();
  }

  private checkPWAStatus(): void {
    // Check if app is running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    
    this.isStandalone.next(isStandalone);
    
    // Check if app is installed (approximate detection)
    const isInstalled = isStandalone || 
                       localStorage.getItem('pwa-installed') === 'true';
    
    this.isInstalled.next(isInstalled);
  }

  private listenForInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.promptEvent = event as PWAPromptEvent;
      console.log('PWA install prompt available');
    });
  }

  private listenForAppInstalled(): void {
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.isInstalled.next(true);
      localStorage.setItem('pwa-installed', 'true');
      this.promptEvent = null;
    });
  }

  private listenForServiceWorkerUpdates(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.isUpdateAvailable.next(true);
        console.log('Service Worker update available');
      });
    }
  }

  async installPWA(): Promise<boolean> {
    if (!this.promptEvent) {
      console.warn('PWA install prompt not available');
      return false;
    }

    try {
      await this.promptEvent.prompt();
      const { outcome } = await this.promptEvent.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted PWA install');
        this.isInstalled.next(true);
        localStorage.setItem('pwa-installed', 'true');
        return true;
      } else {
        console.log('User dismissed PWA install');
        return false;
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    } finally {
      this.promptEvent = null;
    }
  }

  canInstall(): boolean {
    return this.promptEvent !== null && !this.isInstalled.value;
  }

  async updateServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          this.isUpdateAvailable.next(false);
          window.location.reload();
        }
      } catch (error) {
        console.error('Error updating service worker:', error);
      }
    }
  }

  // Offline/Online status
  getOnlineStatus() {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    return merge(online$, offline$).pipe(
      startWith(navigator.onLine)
    );
  }

  // Background sync for offline actions
  async syncOfflineActions(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('background-sync');
          console.log('Background sync registered');
        }
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  // Push notifications
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async subscribeToPushNotifications(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HnSRoFwIDuJBSAPO4wOF2EFLg1SsP7QW_w2aWnOLvQ3F9TA5bJsL6U8c4o'
        )
      });

      console.log('Push notification subscription:', subscription);
      // Send subscription to server
      return true;
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // App performance monitoring
  measurePerformance(markName: string): void {
    if ('performance' in window) {
      performance.mark(markName);
    }
  }

  getPerformanceMetrics(): any {
    if ('performance' in window) {
      return {
        navigation: performance.getEntriesByType('navigation')[0],
        paint: performance.getEntriesByType('paint'),
        measure: performance.getEntriesByType('measure'),
        memory: (performance as any).memory
      };
    }
    return null;
  }
}