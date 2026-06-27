/* ============================================================================
 * EventLink · pwa-bootstrap.js (compartilhado pelos 4 arquivos HTML)
 * ----------------------------------------------------------------------------
 * - Registra o Service Worker (app shell offline, abertura instantânea)
 * - Captura o evento de instalação e expõe window.EventLinkPWA.promptInstall()
 * - Adiciona classe ao <html> quando já está rodando como app instalado
 * - Pequenas otimizações de toque para sensação "nativa"
 * ==========================================================================*/
(function () {
  'use strict';

  // ---------- Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('[PWA] Falha ao registrar Service Worker:', err);
      });
    });
  }

  // ---------- Detecta modo "instalado" (standalone) ----------
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; // iOS

  document.documentElement.classList.add(isStandalone ? 'pwa-standalone' : 'pwa-browser');

  // ---------- Prompt de instalação (Android/Desktop Chrome) ----------
  let deferredInstallEvent = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallEvent = e;
    document.dispatchEvent(new CustomEvent('eventlink:installable', { detail: true }));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallEvent = null;
    document.dispatchEvent(new CustomEvent('eventlink:installed'));
  });

  async function promptInstall() {
    if (!deferredInstallEvent) return 'unavailable';
    deferredInstallEvent.prompt();
    const { outcome } = await deferredInstallEvent.userChoice;
    deferredInstallEvent = null;
    return outcome; // 'accepted' | 'dismissed'
  }

  window.EventLinkPWA = {
    promptInstall,
    isStandalone,
    canInstall: () => deferredInstallEvent !== null
  };

  // ---------- Otimizações de toque (sensação nativa) ----------
  // Remove o "flash" cinza ao tocar em links/botões no Android
  document.addEventListener('DOMContentLoaded', () => {
    document.body.style.webkitTapHighlightColor = 'transparent';
  });

  // Evita o zoom acidental por duplo-toque, mantendo pinch-zoom desativado
  // (o viewport já tem user-scalable=no; isto é um reforço para WebViews antigos)
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // Evita "pull-to-refresh" acidental do navegador mobile dentro do app instalado
  if (isStandalone) {
    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('[data-scrollable]') || document.scrollingElement.scrollTop > 0) return;
      // Permite scroll normal; só evita o overscroll no topo da página
    }, { passive: true });
  }
})();
