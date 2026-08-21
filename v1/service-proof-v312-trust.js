'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const walletRe=/^0x[0-9a-f]{40}$/;
  const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
  const short=value=>{const s=String(value||'');return s.length>18?`${s.slice(0,8)}…${s.slice(-6)}`:(s||'—')};

  function currentWallet(){
    try{return String(typeof account!=='undefined'?account:'').toLowerCase()}catch{return ''}
  }

  function providerField(){return document.getElementById('evoServiceProviderWallet')}

  function validateProviderField(){
    const input=providerField();if(!input)return true;
    const provider=String(input.value||'').trim().toLowerCase();
    const owner=currentWallet();
    let message='';
    if(provider&&!walletRe.test(provider))message=t('Ingresá una wallet EVM válida.','Enter a valid EVM wallet.');
    else if(provider&&owner&&provider===owner)message=t('El proveedor debe usar una wallet distinta a la del propietario.','The provider must use a wallet different from the owner.');
    input.setCustomValidity(message);
    let hint=document.getElementById('evoProviderWalletTrustHint');
    if(!hint){hint=document.createElement('span');hint.id='evoProviderWalletTrustHint';hint.className='sub';input.insertAdjacentElement('afterend',hint)}
    hint.textContent=provider
      ?(message||t('La segunda firma sólo podrá realizarla esta wallet.','Only this wallet will be able to add the second signature.'))
      :t('Opcional. Si designás proveedor, debe ser una wallet diferente a la del propietario.','Optional. If you designate a provider, it must be a different wallet from the owner.');
    hint.style.color=message?'#ff9caa':'';
    return !message;
  }

  document.addEventListener('input',event=>{if(event.target?.id==='evoServiceProviderWallet')validateProviderField()});
  document.addEventListener('submit',event=>{
    if(event.target?.id!=='evoServiceProofForm')return;
    if(validateProviderField())return;
    event.preventDefault();event.stopImmediatePropagation();
    const out=document.getElementById('evoServiceResult');
    if(out){out.className='full result';out.textContent='';const bad=document.createElement('span');bad.className='status bad';bad.textContent=t('✕ PROVEEDOR NO VÁLIDO','✕ INVALID PROVIDER');const p=document.createElement('p');p.textContent=providerField()?.validationMessage||'';out.append(bad,p)}
    try{toast(providerField()?.validationMessage||t('Revisá la wallet del proveedor.','Check the provider wallet.'))}catch{}
  },true);

  function evidenceText(proof){
    if(proof.evidence_level==='PROVIDER_COUNTERSIGNED')return t('CONTRAFIRMADO POR PROVEEDOR','PROVIDER COUNTERSIGNED');
    if(proof.provider_wallet)return t('PENDIENTE DE PROVEEDOR','PROVIDER PENDING');
    return t('DECLARADO POR PROPIETARIO','OWNER DECLARED');
  }

  async function fetchProofs(sealId){
    if(typeof SUPABASE_URL==='undefined'||typeof SUPABASE_KEY==='undefined')return [];
    const url=new URL(`${SUPABASE_URL}/rest/v1/evo_service_proofs`);
    url.searchParams.set('seal_id',`eq.${sealId}`);
    url.searchParams.set('status','eq.ACTIVE');
    url.searchParams.set('select','proof_id,provider_wallet,evidence_level');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    return response.ok?response.json():[];
  }

  async function decorateEvidenceStates(){
    validateProviderField();
    const seal=String(new URLSearchParams(location.search).get('seal')||document.getElementById('passportSealId')?.value||'').trim().toUpperCase();
    if(!sealRe.test(seal))return;
    const proofs=await fetchProofs(seal);if(!proofs.length)return;
    const map=new Map(proofs.map(proof=>[proof.proof_id,proof]));
    document.querySelectorAll('.evoServiceHistoryEvent,.evoServiceItem').forEach(item=>{
      const id=String(item.dataset.proofId||item.querySelector('code')?.textContent||'').trim().toUpperCase();
      const proof=map.get(id);if(!proof)return;
      const badge=item.querySelector('.status');if(badge){badge.textContent=evidenceText(proof);badge.classList.toggle('ok',proof.evidence_level==='PROVIDER_COUNTERSIGNED')}
      if(proof.provider_wallet&&!item.querySelector('.evoProviderWalletMeta')){
        const meta=item.querySelector('.eventMeta,.evoServiceMeta');if(meta){const span=document.createElement('span');span.className='evoProviderWalletMeta';span.textContent=`${t('Wallet proveedor','Provider wallet')}: ${short(proof.provider_wallet)}`;meta.append(span)}
      }
    });
  }

  let queued=false;const schedule=()=>{if(queued)return;queued=true;setTimeout(async()=>{queued=false;try{await decorateEvidenceStates()}catch{}},180)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('evo:wallet-connected',schedule);
  document.addEventListener('click',event=>{if(event.target.closest('.myEvoManageAsset,#passportLoadBtn'))schedule()});
  setTimeout(schedule,400);
})();
