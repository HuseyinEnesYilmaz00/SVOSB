'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('PWA Service Worker başarıyla kaydedildi:', registration.scope);
          },
          function(err) {
            console.log('PWA Service Worker kayıt hatası:', err);
          }
        );
      });
    }
  }, []);

  return null;
}
