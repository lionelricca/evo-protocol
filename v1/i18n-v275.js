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
    'Volver a Mi EVO':'Back to My EVO',

    'EVO Protocol · Verificación documental y pasaportes digitales':'EVO Protocol · Document verification and digital passports',
    'Verificá documentos. Conservá evidencia.':'Verify documents. Preserve evidence.',
    'EVO Origin comprueba si el archivo que recibiste coincide exactamente con una versión registrada, muestra quién lo declaró y conserva su procedencia. EVO Passport extiende la misma capa de confianza a activos, propiedad e historial técnico.':'EVO Origin checks whether the file you received exactly matches a registered version, shows who declared it, and preserves its provenance. EVO Passport extends the same trust layer to assets, ownership, and technical history.',
    'Verificar archivo':'Verify file',
    'Ver planes':'View plans',
    'Coincidencia exacta':'Exact file match',
    'Autoridad separada':'Separate authority',
    'Historial firmado':'Signed history',
    'Creá tu primer EVO Proof gratis. Para los siguientes, elegí un plan y pagá con una criptomoneda compatible disponible en tu wallet.':'Create your first EVO Proof free. For additional Proofs, choose a plan and pay with a compatible cryptocurrency available in your wallet.',
    'US$4,90 por Proof.':'US$4.90 per Proof.',
    'Huella exacta del archivo':'Exact file fingerprint',
    'Autoridad explícita':'Explicit authority',
    'Crear un registro EVO':'Create an EVO record',
    'Elegí documento para crear un EVO Origin Proof o registrá otro tipo de activo como EVO Passport. Los archivos permanecen en tu dispositivo: EVO conserva únicamente su huella digital SHA-256.':'Choose document to create an EVO Origin Proof, or register another asset type as an EVO Passport. Files stay on your device: EVO stores only their SHA-256 fingerprint.',
    'Crear registro verificable':'Create verifiable record',
    'Conectá tu wallet para crear un registro EVO.':'Connect your wallet to create an EVO record.',
    'cada registro recibe su propio EVO Seal ID.':'each record receives its own EVO Seal ID.',
    'abre la ficha pública.':'opens the public record.',
    'conserva eventos y cambios permitidos.':'preserves allowed events and changes.',
    'cualquier persona puede verificar un registro EVO gratuitamente.':'anyone can verify an EVO record free of charge.',
    'Verificar un registro EVO':'Verify an EVO record',
    'La consulta pública es gratuita. Ingresá un EVO Seal ID o escaneá el QR. Si es un documento, también podés seleccionar el archivo recibido: su SHA-256 se calcula localmente y EVO distingue coincidencia exacta, otra versión conocida o archivo diferente.':'Public verification is free. Enter an EVO Seal ID or scan the QR. For a document, you can also select the received file: its SHA-256 is calculated locally and EVO distinguishes an exact match, another known version, or a different file.',
    'Producto independiente creado por Lionel Ricca':'Independent product created by Lionel Ricca'
  };
  try{
    if(typeof EVO_ES_EN!=='undefined'&&typeof EVO_EN_ES!=='undefined'){
      Object.entries(additions).forEach(([es,en])=>{EVO_ES_EN[es]=en;EVO_EN_ES[en]=es;});
    }
  }catch{}

  const applyHead=lang=>{
    const description=document.querySelector('meta[name="description"]');
    if(lang==='en'){
      document.title='EVO Protocol · Document verification and digital passports';
      if(description)description.content='EVO Origin verifies files with SHA-256, shows who registered them, and preserves provenance and history. EVO Passport extends the same trust layer to assets and services.';
    }else{
      document.title='EVO Protocol · Verificación documental y pasaportes digitales';
      if(description)description.content='EVO Origin verifica archivos por SHA-256, muestra quién los registró y conserva su procedencia e historial. EVO Passport extiende la misma capa de confianza a activos y servicios.';
    }
  };

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
  applyHead(active);
  selector.value=active;

  selector.addEventListener('change',event=>{
    event.stopImmediatePropagation();
    const lang=event.target.value==='en'?'en':'es';
    localStorage.setItem('evo-language',lang);
    if(typeof window.evoSetLanguage==='function')window.evoSetLanguage(lang,false);
    applyHead(lang);
    const url=new URL(location.href);
    url.searchParams.set('lang',lang);
    url.searchParams.set('v','20260823-v400');
    setTimeout(()=>location.assign(url.toString()),40);
  },true);
})();
