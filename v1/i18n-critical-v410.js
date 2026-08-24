'use strict';

(()=>{
  const critical={
    '1 por usuario elegible':'1 per eligible user',
    'Gratis disponible':'Free available',
    'Incluye tu Free Proof':'Includes your Free Proof',
    'Tu primer Free Proof está disponible después de validar elegibilidad antifraude. Crear otra wallet no reinicia el beneficio.':'Your first Free Proof is available after anti-fraud eligibility checks. Creating another wallet does not reset the benefit.',
    'Esta instalación o señal de red ya no es elegible para otro Free Proof. Crear otra wallet no reinicia el beneficio.':'This installation or network signal is not eligible for another Free Proof. Creating another wallet does not reset the benefit.',
    'Crear mi Proof gratis':'Create my free Proof',
    'Tu Free Proof ya no está disponible y no tenés un EVO Proof comprado. Comprá 1 EVO Proof antes de continuar.':'Your Free Proof is no longer available and you have no purchased EVO Proof. Buy 1 EVO Proof to continue.',
    'Podés crear otro registro EVO. La cantidad exacta de EVO Proofs es privada.':'You can create another EVO record. The exact EVO Proof balance is private.',
    'Para crear otro registro EVO necesitás 1 EVO Proof.':'To create another EVO record you need 1 EVO Proof.',
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

  const rewrites=new Map([
    ['1 por wallet',{es:'1 por usuario elegible',en:'1 per eligible user'}],
    ['1 per wallet',{es:'1 por usuario elegible',en:'1 per eligible user'}],
    ['Esta wallet todavía tiene su único Free Proof.',{es:'Tu primer Free Proof está disponible después de validar elegibilidad antifraude. Crear otra wallet no reinicia el beneficio.',en:'Your first Free Proof is available after anti-fraud eligibility checks. Creating another wallet does not reset the benefit.'}],
    ['This wallet still has its one Free Proof.',{es:'Tu primer Free Proof está disponible después de validar elegibilidad antifraude. Crear otra wallet no reinicia el beneficio.',en:'Your first Free Proof is available after anti-fraud eligibility checks. Creating another wallet does not reset the benefit.'}],
    ['Crear mi Passport gratis',{es:'Crear mi Proof gratis',en:'Create my free Proof'}],
    ['Create my free Passport',{es:'Crear mi Proof gratis',en:'Create my free Proof'}],
    ['Esta wallet ya usó su Proof gratuito y no tiene EVO Proof disponible. Comprá 1 EVO Proof antes de continuar.',{es:'Tu Free Proof ya no está disponible y no tenés un EVO Proof comprado. Comprá 1 EVO Proof antes de continuar.',en:'Your Free Proof is no longer available and you have no purchased EVO Proof. Buy 1 EVO Proof to continue.'}],
    ['This wallet already used its free Proof and has no EVO Proof available. Buy 1 EVO Proof to continue.',{es:'Tu Free Proof ya no está disponible y no tenés un EVO Proof comprado. Comprá 1 EVO Proof antes de continuar.',en:'Your Free Proof is no longer available and you have no purchased EVO Proof. Buy 1 EVO Proof to continue.'}],
    ['Esta wallet puede crear otro Passport. La cantidad exacta de EVO Proofs es privada.',{es:'Podés crear otro registro EVO. La cantidad exacta de EVO Proofs es privada.',en:'You can create another EVO record. The exact EVO Proof balance is private.'}],
    ['This wallet can create another Passport. The exact EVO Proof balance is private.',{es:'Podés crear otro registro EVO. La cantidad exacta de EVO Proofs es privada.',en:'You can create another EVO record. The exact EVO Proof balance is private.'}],
    ['Para crear otro Passport necesitás 1 EVO Proof.',{es:'Para crear otro registro EVO necesitás 1 EVO Proof.',en:'To create another EVO record you need 1 EVO Proof.'}],
    ['To create another Passport you need 1 EVO Proof.',{es:'Para crear otro registro EVO necesitás 1 EVO Proof.',en:'To create another EVO record you need 1 EVO Proof.'}],
    ['Podés crear otro Passport. La cantidad exacta de EVO Proofs sólo se muestra después de firmar una solicitud de lectura.',{es:'Podés crear otro registro EVO. La cantidad exacta de EVO Proofs sólo se muestra después de firmar una solicitud de lectura.',en:'You can create another EVO record. The exact EVO Proof balance is shown only after signing a read request.'}],
    ['You can create another Passport. The exact EVO Proof balance is shown only after signing a read request.',{es:'Podés crear otro registro EVO. La cantidad exacta de EVO Proofs sólo se muestra después de firmar una solicitud de lectura.',en:'You can create another EVO record. The exact EVO Proof balance is shown only after signing a read request.'}],
    ['No hay un Proof disponible para crear otro Passport. Los contadores exactos siguen siendo privados.',{es:'No hay un EVO Proof disponible para crear otro registro. Los contadores exactos siguen siendo privados.',en:'No EVO Proof is available to create another record. Exact counters remain private.'}],
    ['No Proof is available to create another Passport. Exact counters remain private.',{es:'No hay un EVO Proof disponible para crear otro registro. Los contadores exactos siguen siendo privados.',en:'No EVO Proof is available to create another record. Exact counters remain private.'}]
  ]);

  function lang(){return document.documentElement.lang==='en'?'en':'es'}
  function rewriteValue(value){
    let output=String(value||'');
    const active=lang();
    for(const [source,target] of rewrites){
      if(output.includes(source))output=output.split(source).join(target[active]);
    }
    output=output.replace(/nuevos Passports/g,active==='en'?'new EVO records':'nuevos registros EVO');
    output=output.replace(/new Passports/g,active==='en'?'new EVO records':'nuevos registros EVO');
    return output;
  }

  function normalizeNode(root){
    if(!root||typeof Node==='undefined')return;
    if(root.nodeType===Node.TEXT_NODE){
      const parent=root.parentElement;
      if(parent&&!/^(SCRIPT|STYLE|CODE)$/i.test(parent.tagName)){
        const next=rewriteValue(root.nodeValue);
        if(next!==root.nodeValue)root.nodeValue=next;
      }
      return;
    }
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
    if(typeof document.createTreeWalker!=='function'||typeof NodeFilter==='undefined')return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const parent=node.parentElement;
      if(!parent||/^(SCRIPT|STYLE|CODE)$/i.test(parent.tagName))continue;
      const next=rewriteValue(node.nodeValue);
      if(next!==node.nodeValue)node.nodeValue=next;
    }
  }

  try{
    if(typeof EVO_ES_EN!=='undefined'&&typeof EVO_EN_ES!=='undefined'){
      Object.entries(critical).forEach(([es,en])=>{
        EVO_ES_EN[es]=en;
        EVO_EN_ES[en]=es;
      });
      EVO_ES_EN['1 por wallet']='1 per eligible user';
      EVO_EN_ES['1 per wallet']='1 por usuario elegible';
    }
  }catch{}

  function normalizeCriticalCopy(){
    const active=lang();
    const scope=document.querySelector('#demoPlanCard .sub');
    if(scope)scope.textContent=active==='en'?'1 per eligible user':'1 por usuario elegible';
    const action=document.getElementById('demoPlanAction');
    if(action&&/(Passport gratis|free Passport)/i.test(action.textContent||''))action.textContent=active==='en'?'Create my free Proof':'Crear mi Proof gratis';
    normalizeNode(document.body);
  }

  function reapply(){
    normalizeCriticalCopy();
    try{if(typeof window.evoSetLanguage==='function')window.evoSetLanguage(lang(),false)}catch{}
    normalizeCriticalCopy();
  }

  const selector=document.getElementById('languageSelect');
  selector?.addEventListener('change',()=>setTimeout(reapply,60));
  window.addEventListener('evo:wallet-connected',()=>setTimeout(normalizeCriticalCopy,40));
  window.addEventListener('evo:wallet-disconnected',()=>setTimeout(normalizeCriticalCopy,40));

  if(typeof MutationObserver!=='undefined'&&document.body){
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        if(mutation.type==='characterData')normalizeNode(mutation.target);
        mutation.addedNodes.forEach(normalizeNode);
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  reapply();
  console.info('EVO critical copy V4.1',{mode:'ORIGIN FIRST / ELIGIBLE USER / BILINGUAL'});
})();
