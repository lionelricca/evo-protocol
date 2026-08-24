'use strict';

(()=>{
  const form=document.getElementById('sealForm');
  if(!form)return;

  const byId=id=>document.getElementById(id);
  const cleanSingle=(value,{stripLeading=false}={})=>{
    let text=String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
    if(stripLeading)text=text.replace(/^[\s:;|·]+/,'').trim();
    return text;
  };
  const cleanDescription=value=>String(value||'')
    .replace(/\r\n?/g,'\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
    .replace(/[ \t]+$/gm,'')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
  const hex=buffer=>[...new Uint8Array(buffer)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const hashFile=async file=>file?hex(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())):'';
  const shortWallet=value=>/^0x[0-9a-fA-F]{40}$/.test(String(value||''))?`${String(value).slice(0,8)}…${String(value).slice(-6)}`:'—';

  function normalizeForm(){
    const fields=[['title',{stripLeading:true}],['issuer',{}],['serial',{}],['assetManufacturer',{}],['assetModel',{}],['assetYear',{}],['assetLocation',{}]];
    for(const [id,options] of fields){const input=byId(id);if(input)input.value=cleanSingle(input.value,options)}
    const description=byId('description');if(description)description.value=cleanDescription(description.value);
  }

  function suspiciousDescription(value){
    const text=String(value||'').toLowerCase();
    const markers=['metamask','crear registro verificable','archivo opcional','pulsá','pulsa ','seleccioná','selecciona ','checkout','firma únicamente','firma unicamente'];
    return markers.filter(marker=>text.includes(marker)).length>=2;
  }

  function ensureDialog(){
    let dialog=document.getElementById('evoSealReviewDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='evoSealReviewDialog';
    dialog.className='evoSealReviewDialog';
    dialog.innerHTML=`
      <div class="evoSealReviewCard">
        <div class="evoSealReviewHead">
          <div><span class="kicker">REVISIÓN FINAL</span><h3>Esto es lo que EVO va a publicar</h3></div>
          <button type="button" class="evoSealReviewClose" aria-label="Cerrar">×</button>
        </div>
        <p class="sub">Revisá los datos antes de firmar. Después de la firma, este registro será evidencia pública y no se edita silenciosamente.</p>
        <div id="evoSealReviewWarning" class="passportNotice evoSealReviewWarning" hidden></div>
        <div class="evoSealReviewGrid">
          <div><span>Tipo</span><b id="evoReviewType"></b></div>
          <div><span>Título</span><b id="evoReviewTitle"></b></div>
          <div><span>Emisor declarado</span><b id="evoReviewIssuer"></b></div>
          <div><span>Referencia</span><b id="evoReviewSerial"></b></div>
          <div class="full"><span>Descripción pública</span><pre id="evoReviewDescription"></pre></div>
          <div class="full"><span>Archivo</span><b id="evoReviewFile"></b></div>
          <div class="full"><span>SHA-256 local</span><code id="evoReviewHash"></code></div>
          <div class="full"><span>Wallet firmante</span><code id="evoReviewWallet"></code></div>
        </div>
        <label class="evoSealReviewConfirm"><input id="evoReviewConfirmCheck" type="checkbox"> Confirmo que estos datos son correctos y pueden quedar visibles públicamente.</label>
        <div class="actions evoSealReviewActions"><button id="evoReviewEdit" class="btn" type="button">Volver y corregir</button><button id="evoReviewSign" class="btn primary" type="button" disabled>Confirmar y firmar</button></div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.evoSealReviewClose').onclick=()=>dialog.close('cancel');
    byId('evoReviewEdit').onclick=()=>dialog.close('edit');
    byId('evoReviewConfirmCheck').onchange=event=>{byId('evoReviewSign').disabled=!event.target.checked};
    return dialog;
  }

  async function review(){
    normalizeForm();
    if(!byId('title')?.value){byId('title')?.focus();throw new Error('Ingresá un título antes de continuar.');}
    const file=byId('file')?.files?.[0]||null;
    const digest=file?await hashFile(file):'';
    const dialog=ensureDialog();
    byId('evoReviewType').textContent=byId('type')?.selectedOptions?.[0]?.textContent||byId('type')?.value||'—';
    byId('evoReviewTitle').textContent=byId('title')?.value||'—';
    byId('evoReviewIssuer').textContent=byId('issuer')?.value||'Sin emisor declarado';
    byId('evoReviewSerial').textContent=byId('serial')?.value||'—';
    byId('evoReviewDescription').textContent=byId('description')?.value||'Sin descripción pública';
    byId('evoReviewFile').textContent=file?`${file.name} · ${file.size} bytes`:'Sin archivo';
    byId('evoReviewHash').textContent=digest||'N/A';
    let wallet='';try{wallet=String(typeof account!=='undefined'?account:'')}catch{}
    byId('evoReviewWallet').textContent=shortWallet(wallet);
    const warning=byId('evoSealReviewWarning');
    const suspicious=suspiciousDescription(byId('description')?.value);
    warning.hidden=!suspicious;
    if(suspicious)warning.textContent='Revisá la descripción: parece contener instrucciones o texto pegado que podría no pertenecer al registro.';
    const check=byId('evoReviewConfirmCheck');check.checked=false;byId('evoReviewSign').disabled=true;
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;dialog.close(value?'confirm':'cancel');resolve(value)};
      byId('evoReviewSign').onclick=()=>finish(true);
      const priorClose=dialog.onclose;
      dialog.onclose=()=>{if(typeof priorClose==='function')priorClose();if(!done){done=true;resolve(false)}};
      dialog.showModal();
    });
  }

  form.addEventListener('submit',async event=>{
    if(form.dataset.evoReviewApproved==='1'){
      delete form.dataset.evoReviewApproved;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    try{
      const approved=await review();
      if(!approved)return;
      form.dataset.evoReviewApproved='1';
      form.requestSubmit();
    }catch(error){
      try{toast(error?.message||'Revisá los datos antes de continuar.')}catch{}
    }
  },true);

  console.info('EVO Seal review',{mode:'NORMALIZE + EXACT PUBLIC PREVIEW + EXPLICIT CONFIRMATION BEFORE SIGNATURE'});
})();
