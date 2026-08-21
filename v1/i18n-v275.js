'use strict';

(()=>{
  document.documentElement.setAttribute('translate','no');
  document.documentElement.classList.add('notranslate');
  if(!document.querySelector('meta[name="google"][content="notranslate"]')){
    const meta=document.createElement('meta');
    meta.name='google';
    meta.content='notranslate';
    document.head.appendChild(meta);
  }

  const additions={
    'Mi EVO':'My EVO',
    'Tu espacio en EVO':'Your EVO space',
    'Proofs disponibles':'Available Proofs',
    'Passports creados':'Passports created',
    'Activos en propiedad':'Assets owned',
    'Actividad reciente':'Recent activity',
    'Sin Proofs disponibles':'No Proofs available',
    'Emitidos por esta wallet':'Issued by this wallet',
    'Propiedad actual calculada por historial':'Current ownership calculated from history',
    'Eventos públicos relacionados':'Related public events',
    'Biblioteca EVO':'EVO Library',
    'Tus activos y Passports, sin información duplicada.':'Your assets and Passports, without duplicated information.',
    'Buscar activo, serie o EVO ID...':'Search asset, serial or EVO ID...',
    'En propiedad':'Owned',
    'Creados':'Created',
    'Todos':'All',
    'TU ACTIVO':'YOUR ASSET',
    'RECIBIDO':'RECEIVED',
    'TRANSFERIDO':'TRANSFERRED',
    'Passport activo':'Active Passport',
    'Ver Passport':'View Passport',
    'Gestionar':'Manage',
    'Copiar enlace':'Copy link',
    'Crear Proof':'Create Proof',
    'Actualizar':'Refresh',
    'PRUEBA DOCUMENTAL':'DOCUMENT PROOF',
    'El original no se sube':'The original is not uploaded',
    'EVO calcula SHA-256 localmente y registra sólo la prueba criptográfica.':'EVO calculates SHA-256 locally and records only the cryptographic proof.',
    'SHA-256 LOCAL':'LOCAL SHA-256',
    'QR PÚBLICO':'PUBLIC QR',
    'SIN CUENTA PARA VERIFICAR':'NO ACCOUNT REQUIRED',
    'NOMBRE DEL DOCUMENTO':'DOCUMENT NAME',
    'REFERENCIA / NÚMERO DE DOCUMENTO':'REFERENCE / DOCUMENT NUMBER',
    'DESCRIPCIÓN PÚBLICA (OPCIONAL)':'PUBLIC DESCRIPTION (OPTIONAL)',
    'Registro creado':'Record created',
    'El emisor creó y firmó el EVO Proof.':'The issuer created and signed the EVO Proof.',
    'Qué significa esta página:':'What this page means:',
    'Compartir Pasaporte':'Share Passport',
    'Ver registro técnico':'View technical record',
    'EVO · PASAPORTE PÚBLICO':'EVO · PUBLIC PASSPORT',
    'DESCRIPCIÓN':'DESCRIPTION',
    'WALLET PROPIETARIA':'OWNER WALLET',
    'PROPIETARIO ACTUAL':'CURRENT OWNER',
    'CONTROL CONFIRMADO':'CONTROL CONFIRMED',
    'HISTORIAL':'HISTORY',
    'FIRMA':'SIGNATURE',
    'EMISOR':'ISSUER',
    'REGISTRADO':'REGISTERED',
    'VERIFICADA':'VERIFIED',
    'Verificar este Passport':'Verify this Passport',
    'Consulta pública · sin wallet':'Public lookup · no wallet',
    'Volver a Mi EVO':'Back to My EVO'
  };
  try{
    if(typeof EVO_ES_EN!=='undefined'&&typeof EVO_EN_ES!=='undefined'){
      Object.entries(additions).forEach(([es,en])=>{EVO_ES_EN[es]=en;EVO_EN_ES[en]=es;});
    }
  }catch{}

  const ensureMyEvoReturn=()=>{
    if(document.querySelector('script[data-evo-myevo-return-v276]'))return;
    const script=document.createElement('script');
    script.src='./myevo-return-v276.js?v=20260821-v276-fixed';
    script.async=false;
    script.dataset.evoMyevoReturnV276='true';
    document.head.appendChild(script);
  };
  ensureMyEvoReturn();

  const selector=document.getElementById('languageSelect');
  if(!selector)return;

  const requested=new URLSearchParams(location.search).get('lang');
  const saved=localStorage.getItem('evo-language');
  const active=requested==='en'||requested==='es'?requested:(saved==='en'||saved==='es'?saved:(document.documentElement.lang==='en'?'en':'es'));
  if(typeof window.evoSetLanguage==='function')window.evoSetLanguage(active,false);
  selector.value=active;

  selector.addEventListener('change',event=>{
    event.stopImmediatePropagation();
    const lang=event.target.value==='en'?'en':'es';
    localStorage.setItem('evo-language',lang);
    if(typeof window.evoSetLanguage==='function')window.evoSetLanguage(lang,false);
    const url=new URL(location.href);
    url.searchParams.set('lang',lang);
    url.searchParams.set('v','20260821-v276');
    setTimeout(()=>location.assign(url.toString()),40);
  },true);
})();
