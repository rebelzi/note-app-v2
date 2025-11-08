// CSS imports
import '../styles/styles.css';

import App from './pages/app';

// Register Service Worker untuk push notification
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('✅ Service Worker berhasil didaftar:', registration);
    } catch (error) {
      console.error('❌ Gagal mendaftar Service Worker:', error);
    }
  });
} else {
  console.warn('⚠️ Service Worker tidak didukung oleh browser ini');
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });
});
