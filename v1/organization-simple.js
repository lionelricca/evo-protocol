(()=>{
  const wait=fn=>{let n=0;const t=setInterval(()=>{if(fn()||++n>80)clearInterval(t)},250)};

  async function walletSummary(){
    const out=document.getElementById('organizationAutofillState');
    if(!out||typeof account==='undefined'||!account)return;
    const short=`${account.slice(0,6)}…${account.slice(-4)}`;
    out.innerHTML=`<span class="status ok">✓ WALLET CARGADA</span><span class="mono">${short}</span>`;
    try{
      if(typeof fetchIssuerProfile==='function'){
        const p=await fetchIssuerProfile(account);
        if(p){
          out.innerHTML=`<span class="status ok">✓ DATOS DE WALLET CARGADOS</span>${p.display_name?`<b>${esc(p.display_name)}</b>`:''}<span class="mono">${short}</span>${p.slug?`<span>EVO: ${esc(p.slug)}</span>`:''}`;
        }
      }
    }catch{}
  }

  function simplify(){
    const form=document.getElementById('organizationForm');
    const country=document.getElementById('organizationCountry');
    const official=document.getElementById('organizationRegistryReference');
    if(!form||!country||!official||document.getElementById('organizationWalletOnlyReady'))return false;

    const marker=document.createElement('span');
    marker.id='organizationWalletOnlyReady';marker.hidden=true;form.appendChild(marker);

    const panel=form.closest('.domainPanel');
    const h=panel?.querySelector('h3');if(h)h.textContent='Identidad de organización';
    const intro=panel?.querySelector('h3 + p');
    if(intro)intro.textContent='EVO muestra sólo los datos ya vinculados a tu wallet. La verificación empresarial es opcional.';

    const details=form.querySelector('details');
    if(details){
      details.open=false;
      const summary=details.querySelector('summary');
      if(summary)summary.textContent='Datos adicionales de empresa (opcional)';
    }

    const countryLabel=country.closest('label');
    if(countryLabel)countryLabel.style.display='none';
    const officialLabel=official.closest('label');
    if(officialLabel)officialLabel.style.display='none';

    const optional=document.createElement('div');
    optional.className='full actions';
    optional.innerHTML='<button id="organizationOptionalBtn" class="btn" type="button">Agregar verificación empresarial</button>';
    const autofill=document.getElementById('organizationAutofillState');
    if(autofill)autofill.insertAdjacentElement('afterend',optional);

    const btn=form.querySelector('button[type="submit"]');
    if(btn)btn.style.display='none';

    document.getElementById('organizationOptionalBtn').onclick=()=>{
      if(countryLabel)countryLabel.style.display='block';
      if(officialLabel)officialLabel.style.display='block';
      if(details)details.style.display='block';
      if(btn){btn.style.display='inline-flex';btn.textContent='Enviar evidencia para revisión';}
      document.getElementById('organizationOptionalBtn').style.display='none';
    };

    const notices=[...form.querySelectorAll('.passportNotice')];
    notices.forEach(n=>{
      if(n.id!=='organizationAutofillState' && !n.closest('details'))n.style.display='none';
    });

    // No polling, no automatic wallet access and no automatic signing.
    // Refresh wallet-derived data only after the user explicitly clicks Connect wallet.
    walletSummary();
    const walletBtn=document.getElementById('walletBtn');
    if(walletBtn)walletBtn.addEventListener('click',()=>{
      setTimeout(walletSummary,700);
    });
    return true;
  }

  wait(simplify);
})();

(()=>{
  if(document.querySelector('script[data-evo-proof-card]'))return;
  const script=document.createElement('script');
  script.src='./proof-card.js?v=20260821-v23-proof-card';
  script.async=true;
  script.dataset.evoProofCard='true';
  document.head.appendChild(script);
})();

(()=>{
  const loadPublicAsset=()=>{
    if(!document.querySelector('link[data-evo-public-asset-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./public-asset.css?v=20260821-v24-public-asset';style.dataset.evoPublicAssetStyle='true';document.head.appendChild(style);
    }
    if(!document.querySelector('link[data-evo-public-asset-v241-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./public-asset-v241.css?v=20260821-v241-polish';style.dataset.evoPublicAssetV241Style='true';document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-evo-public-asset]')){
      const script=document.createElement('script');script.src='./public-asset.js?v=20260821-v24-public-asset';script.async=true;script.dataset.evoPublicAsset='true';document.head.appendChild(script);
    }
    if(!document.querySelector('script[data-evo-public-asset-v241]')){
      const enhance=document.createElement('script');enhance.src='./public-asset-v241.js?v=20260821-v241-polish';enhance.async=true;enhance.dataset.evoPublicAssetV241='true';document.head.appendChild(enhance);
    }
  };
  if(document.readyState==='complete')loadPublicAsset();else window.addEventListener('load',loadPublicAsset,{once:true});
})();

(()=>{
  const loadDashboard=()=>{
    if(!document.querySelector('link[data-evo-dashboard-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./dashboard.css?v=20260821-v251-polish';style.dataset.evoDashboardStyle='true';document.head.appendChild(style);
    }
    if(!document.querySelector('link[data-evo-dashboard-v252-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./dashboard-v252.css?v=20260821-v252-library';style.dataset.evoDashboardV252Style='true';document.head.appendChild(style);
    }
    if(!document.querySelector('link[data-evo-dashboard-v253-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./dashboard-v253.css?v=20260821-v253-premium';style.dataset.evoDashboardV253Style='true';document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-evo-dashboard]')){
      const script=document.createElement('script');script.src='./dashboard.js?v=20260821-v252-library';script.async=true;script.dataset.evoDashboard='true';document.head.appendChild(script);
    }
    if(!document.querySelector('script[data-evo-dashboard-v253]')){
      const enhance=document.createElement('script');enhance.src='./dashboard-v253.js?v=20260821-v27-actions-loader';enhance.async=true;enhance.dataset.evoDashboardV253='true';document.head.appendChild(enhance);
    }
    if(!document.querySelector('link[data-evo-transfer-inbox-style]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='./transfer-inbox.css?v=20260821-v261-compact';style.dataset.evoTransferInboxStyle='true';document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-evo-transfer-inbox]')){
      const inbox=document.createElement('script');inbox.src='./transfer-inbox.js?v=20260821-v261-compact';inbox.async=true;inbox.dataset.evoTransferInbox='true';document.head.appendChild(inbox);
    }
  };
  if(document.readyState==='complete')loadDashboard();else window.addEventListener('load',loadDashboard,{once:true});
})();