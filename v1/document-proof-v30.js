'use strict';

(()=>{
  const type=document.getElementById('type');
  const section=document.getElementById('seal');
  const form=document.getElementById('sealForm');
  const file=document.getElementById('file');
  const language=document.getElementById('languageSelect');
  const createResult=document.getElementById('createResult');
  if(!type||!section||!form||!file)return;

  const currentLanguage=()=>language?.value==='en'?'en':'es';
  const t=(es,en)=>currentLanguage()==='en'?en:es;
  const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const original={
    title:section.querySelector(':scope > h2')?.textContent||'',
    sub:section.querySelector(':scope > p.sub')?.textContent||'',
    submit:form.querySelector('button[type="submit"]')?.textContent||''
  };

  const controlFor=id=>document.getElementById(id);
  const labelFor=id=>controlFor(id)?.closest('label');

  function setFieldCaption(id,text){
    const control=controlFor(id);const label=labelFor(id);if(!control||!label)return;
    while(label.firstChild&&label.firstChild!==control)label.removeChild(label.firstChild);
    let caption=label.querySelector(':scope > .documentFieldCaption');
    if(!caption){caption=document.createElement('span');caption.className='documentFieldCaption';label.insertBefore(caption,control);}
    caption.textContent=text;
    label.setAttribute('translate','no');
  }

  function ensureIntro(){
    let box=document.getElementById('documentProofIntro');
    if(!box){
      box=document.createElement('div');box.id='documentProofIntro';box.className='documentProofIntro';
      form.parentElement?.insertBefore(box,form.parentElement.firstChild);
    }
    box.setAttribute('translate','no');
    return box;
  }

  function renderIntro(){
    const box=ensureIntro();
    box.innerHTML=`<div><span>DOCUMENT PROOF</span><b>${t('El original no se sube','The original is not uploaded')}</b><small>${t('EVO calcula SHA-256 localmente y registra sólo la prueba criptográfica.','EVO calculates SHA-256 locally and registers only the cryptographic proof.')}</small></div><div class="documentProofFacts"><span>SHA-256 LOCAL</span><span>${t('QR PÚBLICO','PUBLIC QR')}</span><span>${t('SIN CUENTA PARA VERIFICAR','NO ACCOUNT TO VERIFY')}</span></div>`;
    return box;
  }

  function ensureHashPreview(){
    let preview=document.getElementById('documentHashPreview');
    if(preview)return preview;
    preview=document.createElement('div');preview.id='documentHashPreview';preview.className='documentHashPreview full';preview.hidden=true;preview.setAttribute('translate','no');
    labelFor('file')?.insertAdjacentElement('afterend',preview);
    return preview;
  }

  function resultPanel(){return createResult?.closest('.panel')||null}

  function renderDocumentResultPanel(){
    const panel=resultPanel();if(!panel)return;
    panel.classList.add('documentProofResultPanel');panel.setAttribute('translate','no');
    const headings=[...panel.querySelectorAll(':scope > h3')];
    if(headings[0])headings[0].textContent=t('Resultado Document Proof','Document Proof result');
    if(headings[1])headings[1].textContent=t('Qué demuestra EVO','What EVO proves');
    if(createResult?.classList.contains('empty'))createResult.textContent=t('Conectá tu wallet para crear el Document Proof.','Connect your wallet to create the Document Proof.');
    const checks=panel.querySelector('.checks');
    if(checks)checks.innerHTML=`
      <p><b>${t('Huella exacta:','Exact fingerprint:')}</b> ${t('SHA-256 identifica el archivo registrado sin almacenar el original.','SHA-256 identifies the registered file without storing the original.')}</p>
      <p><b>${t('Firma del emisor:','Issuer signature:')}</b> ${t('demuestra control de la wallet que emitió esta prueba.','proves control of the wallet that issued this proof.')}</p>
      <p><b>${t('Estado verificable:','Verifiable status:')}</b> ${t('el documento puede figurar ACTIVO, REVOCADO o SUSTITUIDO.','the document can be ACTIVE, REVOKED or SUPERSEDED.')}</p>
      <p><b>${t('QR público:','Public QR:')}</b> ${t('cualquier persona puede consultar la prueba sin wallet.','anyone can check the proof without a wallet.')}</p>
      <p><b>${t('Original privado:','Private original:')}</b> ${t('el archivo permanece en el dispositivo del usuario.','the file remains on the user device.')}</p>`;
  }

  function renderGenericResultPanel(){
    const panel=resultPanel();if(!panel)return;
    panel.classList.remove('documentProofResultPanel');panel.removeAttribute('translate');
    const headings=[...panel.querySelectorAll(':scope > h3')];
    if(headings[0])headings[0].textContent=t('Resultado','Result');
    if(headings[1])headings[1].textContent=t('Qué incluye','What is included');
    if(createResult?.classList.contains('empty'))createResult.textContent=t('Conectá tu wallet para crear el pasaporte.','Connect your wallet to create the passport.');
    const checks=panel.querySelector('.checks');
    if(checks)checks.innerHTML=`
      <p><b>${t('Identidad única:','Unique identity:')}</b> ${t('cada activo recibe su propio EVO Passport ID.','each asset receives its own EVO Passport ID.')}</p>
      <p><b>${t('Código QR verificable:','Verifiable QR code:')}</b> ${t('abre el registro público del activo.','opens the asset public record.')}</p>
      <p><b>${t('Historial:','History:')}</b> ${t('registra intervenciones y cambios de propiedad.','records service events and ownership changes.')}</p>
      <p><b>${t('Firma digital:','Digital signature:')}</b> ${t('identifica la wallet responsable de cada registro.','identifies the wallet responsible for each record.')}</p>
      <p><b>${t('Protección documental:','Document protection:')}</b> ${t('compara archivos mediante su huella SHA-256 sin subir el original.','compares files using their SHA-256 fingerprint without uploading the original.')}</p>
      <p><b>${t('Consulta pública:','Public verification:')}</b> ${t('cualquier persona puede verificar el Passport gratuitamente.','anyone can verify the Passport free of charge.')}</p>`;
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
    const intro=renderIntro();intro.hidden=!doc;
    const tech=document.getElementById('assetManufacturer')?.closest('details');if(tech)tech.hidden=doc;
    file.required=doc;

    if(doc){
      const h2=section.querySelector(':scope > h2');if(h2)h2.textContent=t('Crear Document Proof','Create Document Proof');
      const sub=section.querySelector(':scope > p.sub');if(sub)sub.textContent=t('Convertí un PDF o documento empresarial en una prueba verificable por QR. El archivo original permanece en tu dispositivo.','Turn a PDF or business document into a QR-verifiable proof. The original file stays on your device.');
      setFieldCaption('type',t('Tipo de Proof','Proof type'));
      setFieldCaption('title',t('Nombre del documento','Document name'));
      setFieldCaption('issuer',t('Empresa / emisor','Company / issuer'));
      setFieldCaption('serial',t('Referencia / número de documento','Document reference / number'));
      setFieldCaption('description',t('Descripción pública (opcional)','Public description (optional)'));
      setFieldCaption('file',t('Documento original','Original document'));
      controlFor('title').placeholder=t('Ej. Informe de inspección N° 1842','E.g. Inspection report No. 1842');
      controlFor('serial').placeholder=t('Ej. INF-2026-1842','E.g. RPT-2026-1842');
      controlFor('description').placeholder=t('Descripción pública del documento','Public description of the document');
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent=t('Crear Document Proof','Create Document Proof');
      renderDocumentResultPanel();
    }else{
      const h2=section.querySelector(':scope > h2');if(h2)h2.textContent=t('Crear un pasaporte digital','Create a digital passport');
      const sub=section.querySelector(':scope > p.sub');if(sub)sub.textContent=original.sub;
      setFieldCaption('type',t('Tipo de activo','Asset type'));
      setFieldCaption('title',t('Activo / título','Asset / title'));
      setFieldCaption('issuer',t('Empresa / emisor','Company / issuer'));
      setFieldCaption('serial',t('Serie / referencia','Serial / reference'));
      setFieldCaption('description',t('Descripción','Description'));
      setFieldCaption('file',t('Archivo opcional','Optional file'));
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent=t('Crear pasaporte verificable','Create verifiable passport');
      renderGenericResultPanel();
    }
    updatePreview();
  }

  type.addEventListener('change',apply);
  file.addEventListener('change',updatePreview);
  document.getElementById('clearBtn')?.addEventListener('click',()=>setTimeout(apply,0));
  language?.addEventListener('change',()=>setTimeout(apply,90));
  window.addEventListener('load',()=>setTimeout(apply,120),{once:true});
  apply();
})();
