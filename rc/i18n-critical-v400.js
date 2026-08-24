'use strict';

(()=>{
  const critical={
    '1 por usuario elegible':'1 per eligible user',
    '1 por wallet':'1 per eligible user',
    'Gratis disponible':'Free available',
    'Incluye tu Free Proof':'Includes your Free Proof',
    'Tu primer Free Proof está disponible después de validar elegibilidad antifraude. Crear otra wallet no reinicia el beneficio.':'Your first Free Proof is available after anti-fraud eligibility checks. Creating another wallet does not reset the benefit.',
    'Esta instalación o señal de red ya no es elegible para otro Free Proof. Crear otra wallet no reinicia el beneficio.':'This installation or network signal is not eligible for another Free Proof. Creating another wallet does not reset the benefit.',
    'COINCIDENCIA EXACTA':'EXACT MATCH',
    '✓ COINCIDENCIA EXACTA':'✓ EXACT FILE MATCH',
    'Este es exactamente el archivo registrado':'This is exactly the registered file',
    'Los bytes del archivo producen la misma huella SHA-256 registrada en EVO.':'The file bytes produce the same SHA-256 fingerprint registered in EVO.',
    'SHA-256 local':'Local SHA-256',
    'SHA-256 registrado':'Registered SHA-256',
    'Verificá el archivo exacto':'Verify the exact file',
    'Comparación criptográfica de la copia que recibiste contra la huella registrada y su cadena de versiones.':'Cryptographic comparison of the copy you received against the registered fingerprint and its version chain.',
    'Arrastrá el documento aquí':'Drop the document here',
    'o hacé clic para elegirlo · SHA-256 en tu navegador':'or click to choose it · SHA-256 in your browser',
    'Privacidad':'Privacy',
    ': EVO lee los bytes sólo en tu navegador para calcular la huella. El archivo no se envía al servidor.':': EVO reads the bytes only in your browser to calculate the fingerprint. The file is not sent to the server.',
    'PROOF':'PROOF',
    'FIRMA':'SIGNATURE',
    'EMISOR':'ISSUER',
    'HISTORIAL DOCUMENTAL':'DOCUMENT HISTORY',
    'CONTROL DE WALLET CONFIRMADO':'WALLET CONTROL CONFIRMED',
    '1 EVENTO':'1 EVENT',
    'REGISTRADO':'REGISTERED',
    'VERIFICADA':'VERIFIED',
    'Conectar wallet':'Connect wallet'
  };

  try{
    if(typeof EVO_ES_EN!=='undefined'&&typeof EVO_EN_ES!=='undefined'){
      Object.entries(critical).forEach(([es,en])=>{
        EVO_ES_EN[es]=en;
        EVO_EN_ES[en]=es==='1 por wallet'?'1 por usuario elegible':es;
      });
    }
  }catch{}

  function normalizeCriticalCopy(){
    const lang=document.documentElement.lang==='en'?'en':'es';
    const scope=document.querySelector('#demoPlanCard .sub');
    if(scope)scope.textContent=lang==='en'?'1 per eligible user':'1 por usuario elegible';
  }

  function reapply(){
    normalizeCriticalCopy();
    try{if(typeof window.evoSetLanguage==='function')window.evoSetLanguage(document.documentElement.lang==='en'?'en':'es',false)}catch{}
    normalizeCriticalCopy();
  }

  const selector=document.getElementById('languageSelect');
  selector?.addEventListener('change',()=>setTimeout(reapply,90));
  window.addEventListener('evo:wallet-connected',()=>setTimeout(normalizeCriticalCopy,80));
  window.addEventListener('evo:wallet-disconnected',()=>setTimeout(normalizeCriticalCopy,80));
  reapply();
})();
