'use strict';

(()=>{
  const POLICY='V400_ANTISYBIL';
  const CLIENT_KEY='evo-free-proof-client-v400';
  const ENDPOINT=`${SUPABASE_URL}/functions/v1/evo-free-proof`;
  const walletRe=/^0x[0-9a-f]{40}$/;
  const clientRe=/^[0-9a-f]{64}$/;

  function randomHex(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return [...b].map(v=>v.toString(16).padStart(2,'0')).join('')}
  function clientId(){
    try{
      const existing=String(localStorage.getItem(CLIENT_KEY)||'').toLowerCase();
      if(clientRe.test(existing))return existing;
      const created=randomHex(32);localStorage.setItem(CLIENT_KEY,created);return created;
    }catch{return randomHex(32)}
  }
  function text(es,en){return document.documentElement.lang==='en'?en:es}
  async function guardRequest(action,wallet,seal){
    const normalized=String(wallet||'').toLowerCase();
    if(!walletRe.test(normalized))throw new Error(text('Wallet inválida.','Invalid wallet.'));
    const body={action,wallet:normalized,clientId:clientId()};
    if(seal){body.signature=String(seal.signature||'');body.signatureMessage=String(seal.signatureMessage||'')}
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok&&response.status!==409)throw new Error(data.error||'free_proof_guard_unavailable');
    return data;
  }
  function failClosed(base,reason='guard_unavailable'){
    return {...base,demoAvailable:false,canCreate:false,antiSybilPolicy:'UNAVAILABLE',trialReason:reason,freeProofGuardReady:false};
  }
  function mergeGuard(base,guard){
    if(guard?.policy!==POLICY)return failClosed(base,'policy_not_active');
    const eligible=Boolean(guard.eligible);
    const paid=Boolean(guard.paidAvailable);
    return {...base,demoAvailable:eligible,canCreate:eligible||paid,antiSybilPolicy:POLICY,trialReason:String(guard.reason||''),paidCapability:paid,freeProofGuardReady:true};
  }
  function applyCopy(data){
    const status=document.getElementById('demoPlanStatus');
    const value=document.getElementById('demoPlanValue');
    const action=document.getElementById('demoPlanAction');
    if(!status||!value||!action)return;
    if(!data.freeProofGuardReady){
      value.textContent=text('Protección activándose','Security upgrade pending');
      status.className='passportNotice';
      status.textContent=text('El Free Proof está bloqueado hasta que el control antifraude del servidor esté activo.','Free Proof is locked until the server anti-fraud control is active.');
      action.textContent=text('Free Proof temporalmente bloqueado','Free Proof temporarily locked');
      action.href='#pricing';
      return;
    }
    if(data.demoAvailable){
      status.textContent=text('Tu primer Free Proof está disponible después de validar elegibilidad antifraude. No depende sólo de crear una wallet nueva.','Your first Free Proof is available after anti-fraud eligibility checks. Creating a new wallet alone is not enough.');
      return;
    }
    if(!data.paidCapability){
      status.textContent=text('Esta instalación o señal de red ya no es elegible para otro Free Proof. Crear otra wallet no reinicia el beneficio.','This installation or network signal is not eligible for another Free Proof. Creating another wallet does not reset the benefit.');
    }
  }

  const baseFetchEntitlement=typeof fetchEvoEntitlement==='function'?fetchEvoEntitlement:null;
  if(baseFetchEntitlement){
    fetchEvoEntitlement=async function(wallet){
      const base=await baseFetchEntitlement(wallet);
      try{return mergeGuard(base,await guardRequest('status',wallet))}catch(error){return failClosed(base,error?.message||'guard_unavailable')}
    };
  }

  const baseRenderPublic=typeof renderPublicEntitlement==='function'?renderPublicEntitlement:null;
  if(baseRenderPublic){
    renderPublicEntitlement=function(data){const result=baseRenderPublic(data);applyCopy(data);return result};
  }
  const baseRenderPrivate=typeof renderPrivateEvoBalance==='function'?renderPrivateEvoBalance:null;
  if(baseRenderPrivate){
    renderPrivateEvoBalance=function(data){const result=baseRenderPrivate(data);applyCopy(data);return result};
  }

  const baseFetchPrivate=typeof fetchPrivateEvoBalance==='function'?fetchPrivateEvoBalance:null;
  if(baseFetchPrivate){
    fetchPrivateEvoBalance=async function(wallet){
      const base=await baseFetchPrivate(wallet);
      try{return mergeGuard(base,await guardRequest('status',wallet||account))}catch(error){return failClosed(base,error?.message||'guard_unavailable')}
    };
  }

  const baseRegisterSeal=typeof registerSeal==='function'?registerSeal:null;
  if(baseRegisterSeal){
    registerSeal=async function(seal){
      const wallet=String(seal?.issuerWallet||account||'').toLowerCase();
      let guard;
      try{guard=await guardRequest('status',wallet)}catch{throw new Error(text('El control antifraude del Free Proof todavía no está disponible. No se creó ningún registro.','The Free Proof anti-fraud control is not available yet. No record was created.'))}
      if(guard?.policy!==POLICY)throw new Error(text('La política segura de Free Proof todavía no está activa.','The secure Free Proof policy is not active yet.'));
      if(guard.eligible){
        const reserved=await guardRequest('reserve',wallet,seal);
        if(!reserved?.eligible||reserved?.policy!==POLICY)throw new Error(text('No se pudo reservar el Free Proof de forma segura.','Could not securely reserve the Free Proof.'));
      }else if(!guard.paidAvailable){
        throw new Error(text('No sos elegible para otro Free Proof y no hay un Proof comprado disponible.','You are not eligible for another Free Proof and no purchased Proof is available.'));
      }
      return await baseRegisterSeal(seal);
    };
  }

  window.evoFreeProofGuard={policy:POLICY,clientId:()=>clientId(),status:wallet=>guardRequest('status',wallet)};
  window.addEventListener('evo:wallet-connected',event=>{
    const wallet=event.detail?.account;if(!walletRe.test(String(wallet||'')))return;
    setTimeout(()=>{try{window.evoRefreshEntitlement?.(wallet)}catch{}},60);
  });
  console.info('EVO Free Proof',{policy:POLICY,mode:'WALLET + CLIENT + ANONYMIZED NETWORK / FAIL CLOSED'});
})();
