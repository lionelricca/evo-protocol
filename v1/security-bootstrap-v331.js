'use strict';

(() => {
  const SECURITY_BASELINE = 'EVO-BROWSER-SHIELD-V3.3.1';
  const SECURITY_VERSION = 'EVO-BROWSER-SHIELD-V3.3.5';
  const CRITICAL_LOCAL_FILES = new Set(['browser-shield-v332.css', 'styles.css', 'app.js', 'qrcode.min.js']);
  const APPROVED_RUNTIME_HOSTS = new Set(['sdk.depay.com']);

  function applyFallback(message) {
    const render = () => {
      if (document.body) document.body.classList.add('asset-fallback');
      const verifyResult = document.getElementById('verifyResult');
      if (verifyResult && message) verifyResult.textContent = message;
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', render, { once: true });
    } else {
      render();
    }
  }

  function classifyResource(target) {
    if (!target || !target.tagName) return null;
    const tag = String(target.tagName).toUpperCase();
    if (tag !== 'SCRIPT' && tag !== 'LINK') return null;
    const raw = tag === 'SCRIPT' ? target.src : target.href;
    if (!raw) return null;
    try {
      const url = new URL(raw, window.location.href);
      const file = url.pathname.split('/').filter(Boolean).pop() || '';
      return {
        tag,
        file,
        local: url.origin === window.location.origin,
        approvedRuntimeHost: APPROVED_RUNTIME_HOSTS.has(url.hostname),
      };
    } catch {
      return null;
    }
  }

  window.addEventListener('error', (event) => {
    const resource = classifyResource(event.target);
    if (!resource) return;
    const criticalLocal = resource.local && CRITICAL_LOCAL_FILES.has(resource.file);
    if (criticalLocal) {
      applyFallback('Un componente seguro de EVO no pudo cargarse. Recargá la página antes de continuar.');
    }
  }, true);

  document.addEventListener('securitypolicyviolation', (event) => {
    const directive = String(event.effectiveDirective || 'unknown');
    const blocked = String(event.blockedURI || 'unknown');
    console.warn('[EVO Security] CSP blocked resource', { directive, blocked });
  });

  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set(String(link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', [...rel].join(' '));
    });
  }, { once: true });

  Object.defineProperty(window, 'EVOSecurity', {
    value: Object.freeze({
      browserShield: true,
      baseline: SECURITY_BASELINE,
      version: SECURITY_VERSION,
      inlineScriptAttributesAllowed: false,
      inlineStyleElementsAllowed: false,
      publicTelemetryAuthoritative: false,
    }),
    configurable: false,
    writable: false,
  });
})();
