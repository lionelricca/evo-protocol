'use strict';

(()=>{
  const type=document.getElementById('type');
  const section=document.getElementById('seal');
  const form=document.getElementById('sealForm');
  const file=document.getElementById('file');
  if(!type||!section||!form||!file)return;

  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const original={
    title:section.querySelector(':scope > h2')?.textContent||'',
    sub:section.querySelector(':scope > p.sub')?.textContent||'',
    submit:form.querySelector('button[type="submit"]')?.textContent||''
  };

  const labelFor=id=>document.getElementById(id)?.closest('label');
  const setLabel=(id,text)=>{
    const label=labelFor(id);if(!label)return;
    const input=document.getElementById(id);if(!input)return;
    [...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
    label.insertBefore(document.createTextNode(text),input);
  };

  function ensureIntro(){
    let box=document.getElementById('documentProofIntro');
    if(box)return box;
    box=document.createElement('div');box.id='documentProofIntro';box.className='documentProofIntro';
    box.innerHTML=`<div><span>DOCUMENT PROOF</span><b>${t('El original no se sube','The original is not uploaded')}</b><small>${t('EVO calcula SHA-256 localmente y registra sólo la prueba criptográfica.','EVO calculates SHA-256 locally and registers only the cryptographic proof.')}</small></div><div class="documentProofFacts"><span>SHA-256 LOCAL</span><span>${t('QR PÚBLICO','PUBLIC QR')}</span><span>${t('SIN CUENTA PARA VERIFICAR','NO ACCOUNT TO VERIFY')}</span></div>`;
    form.parentElement?.insertBefore(box,form.parentElement.firstChild);
    return box;
  }

  function ensureHashPreview(){
    let preview=document.getElementById('documentHashPreview');
    if(preview)return preview;
    preview=document.createElement('div');preview.id='documentHashPreview';preview.className='documentHashPreview full';preview.hidden=true;
    labelFor('file')?.insertAdjacentElement('afterend',preview);
    return preview;
  }

  async function hashFile(f){
    const bytes=await f.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function updatePreview(){
    const preview=ensureHashPreview();
    if(type.value!=='Documento'||!file.files?.[0]){preview.hidden=true;preview.textContent='';return;}
    const f=file.files[0];
    preview.hidden=false;preview.innerHTML=`<span>${t('Calculando huella digital…','Calculating fingerprint…')}</span>`;
    try{
      const hash=await hashFile(f);
      preview.innerHTML=`<div><span>${t('DOCUMENTO SELECCIONADO','DOCUMENT SELECTED')}</span><b>${esc(f.name)}</b><small>${Math.max(1,Math.round(f.size/1024))} KB</small></div><div><span>SHA-256</span><code>${esc(hash)}</code></div>`;
    }catch{
      preview.innerHTML=`<span>${t('No se pudo calcular SHA-256 en este navegador.','SHA-256 could not be calculated in this browser.')}</span>`;
    }
  }

  function apply(){
    const doc=type.value==='Documento';
    section.classList.toggle('evoDocumentProofMode',doc);
    const intro=ensureIntro();intro.hidden=!doc;
    const tech=document.getElementById('assetManufacturer')?.closest('details');if(tech)tech.hidden=doc;
    file.required=doc;

    if(doc){
      const h2=section.querySelector(':scope > h2');if(h2)h2.textContent=t('Crear Document Proof','Create Document Proof');
      const sub=section.querySelector(':scope > p.sub');if(sub)sub.textContent=t('Convertí un PDF o documento empresarial en una prueba verificable por QR. El archivo original permanece en tu dispositivo.','Turn a PDF or business document into a QR-verifiable proof. The original file stays on your device.');
      setLabel('title',t('Nombre del documento','Document name'));
      setLabel('issuer',t('Empresa / emisor','Company / issuer'));
      setLabel('serial',t('Referencia / número de documento','Document reference / number'));
      setLabel('description',t('Descripción pública (opcional)','Public description (optional)'));
      setLabel('file',t('Documento original','Original document'));
      document.getElementById('title').placeholder=t('Ej. Informe de inspección N° 1842','E.g. Inspection report No. 1842');
      document.getElementById('serial').placeholder=t('Ej. INF-2026-1842','E.g. RPT-2026-1842');
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent=t('Crear Document Proof','Create Document Proof');
    }else{
      const h2=section.querySelector(':scope > h2');if(h2)h2.textContent=original.title;
      const sub=section.querySelector(':scope > p.sub');if(sub)sub.textContent=original.sub;
      setLabel('title',t('Activo / título','Asset / title'));setLabel('issuer',t('Empresa / emisor','Company / issuer'));setLabel('serial',t('Serie / referencia','Serial / reference'));setLabel('description',t('Descripción','Description'));setLabel('file',t('Archivo opcional','Optional file'));
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent=original.submit;
    }
    updatePreview();
  }

  type.addEventListener('change',apply);
  file.addEventListener('change',updatePreview);
  document.getElementById('clearBtn')?.addEventListener('click',()=>setTimeout(apply,0));
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(apply,60));
  apply();
})();

(()=>{
  const loadOriginVerifier=()=>{
    if(!document.querySelector('link[data-evo-origin-verifier-v322-style]')){
      const style=document.createElement('link');
      style.rel='stylesheet';
      style.href='./origin-verifier-v322.css?v=20260821-v322-origin-verifier';
      style.dataset.evoOriginVerifierV322Style='true';
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-evo-origin-verifier-v322]')){
      const script=document.createElement('script');
      script.src='./origin-verifier-v322.js?v=20260821-v322-origin-verifier';
      script.async=true;
      script.dataset.evoOriginVerifierV322='true';
      document.head.appendChild(script);
    }
  };
  if(document.readyState==='complete')loadOriginVerifier();else window.addEventListener('load',loadOriginVerifier,{once:true});
})();

(()=>{
  const loadOriginAuthority=()=>{
    if(!document.querySelector('link[data-evo-origin-authority-v323-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./origin-authority-v323.css?v=20260821-v323-origin-authority';style.dataset.evoOriginAuthorityV323Style='true';document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-evo-origin-authority-v323]')){
      const script=document.createElement('script');script.src='./origin-authority-v323.js?v=20260821-v323-origin-authority';script.async=true;script.dataset.evoOriginAuthorityV323='true';document.head.appendChild(script);
    }
  };
  if(document.readyState==='complete')loadOriginAuthority();else window.addEventListener('load',loadOriginAuthority,{once:true});
})();
