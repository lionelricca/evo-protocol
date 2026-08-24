'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const stateText=value=>{
    const raw=String(value||'').trim().toUpperCase().replaceAll('_',' ');
    const es={
      'DOMAIN VERIFIED':'DOMINIO VERIFICADO',
      'WALLET PROVEN':'CONTROL CONFIRMADO',
      'ORGANIZATION VERIFIED':'ORGANIZACIÓN VERIFICADA',
      'SELF DECLARED':'AUTODECLARADO',
      'REGISTERED':'REGISTRADO',
      'WALLET SIGNED':'VERIFICADA'
    };
    const en={
      'DOMAIN VERIFIED':'DOMAIN VERIFIED',
      'WALLET PROVEN':'CONTROL CONFIRMED',
      'ORGANIZATION VERIFIED':'ORGANIZATION VERIFIED',
      'SELF DECLARED':'SELF DECLARED',
      'REGISTERED':'REGISTERED',
      'WALLET SIGNED':'VERIFIED'
    };
    return (document.documentElement.lang==='en'?en:es)[raw]||raw;
  };
  const looksLikeWallet=value=>/^0x[0-9a-f]{4,}.*[0-9a-f]{4,}$/i.test(String(value||'').trim());

  function enhance(){
    const host=document.getElementById('publicAssetPage');
    if(!host?.classList.contains('ready'))return false;
    const shell=host.querySelector('.publicAssetShell');
    if(!shell||shell.dataset.evoV242==='1')return false;
    shell.dataset.evoV242='1';

    const intro=host.querySelector('.publicAssetIntro');
    const kicker=host.querySelector('.publicAssetKicker');
    if(kicker)kicker.textContent=t('EVO · PASSPORT PÚBLICO','EVO · PUBLIC PASSPORT');

    const description=host.querySelector('.publicAssetDescription');
    if(intro&&description&&description.parentElement===intro){
      const box=document.createElement('div');box.className='publicAssetDescriptionBlock';
      const label=document.createElement('span');label.textContent=t('DESCRIPCIÓN','DESCRIPTION');
      intro.insertBefore(box,description);box.append(label,description);
    }

    const meta=host.querySelector('.publicAssetMeta');
    const firstMeta=meta?.querySelector('span');
    if(firstMeta&&!firstMeta.dataset.evoTyped){firstMeta.dataset.evoTyped='1';firstMeta.textContent=`${t('TIPO','TYPE')} · ${firstMeta.textContent}`;}

    const infoPanel=host.querySelector('.publicAssetGrid .publicAssetPanel');
    const rows=infoPanel?[...infoPanel.querySelectorAll('.publicAssetRow')]:[];
    const issuer=rows[0]?.querySelector('b')?.textContent?.trim();
    const owner=rows[1]?.querySelector('b')?.textContent?.trim();
    const id=host.querySelector('.publicAssetId');
    if(intro&&id&&(issuer||owner)){
      const quick=document.createElement('div');quick.className='publicAssetQuickFacts';
      if(issuer){const item=document.createElement('div');item.innerHTML=`<span>${t('EMISOR','ISSUER')}</span><b></b>`;item.querySelector('b').textContent=issuer;quick.append(item);}
      if(owner){
        const item=document.createElement('div');
        const label=looksLikeWallet(owner)?t('WALLET PROPIETARIA','OWNER WALLET'):t('PROPIETARIO ACTUAL','CURRENT OWNER');
        item.innerHTML=`<span>${label}</span><b></b>`;
        const value=item.querySelector('b');value.textContent=owner;if(looksLikeWallet(owner))value.classList.add('mono');quick.append(item);
      }
      intro.insertBefore(quick,id);
    }
    if(id&&!id.dataset.evoLabeled){id.dataset.evoLabeled='1';id.textContent=`EVO ID · ${id.textContent}`;}

    const states=[...host.querySelectorAll('.publicAssetState')];
    if(states[0]){states[0].querySelector('span').textContent='PROOF';states[0].querySelector('b').textContent=t('REGISTRADO','REGISTERED');}
    if(states[1]){states[1].querySelector('span').textContent=t('FIRMA','SIGNATURE');states[1].querySelector('b').textContent=t('VERIFICADA','VERIFIED');}
    if(states[2]){states[2].querySelector('span').textContent=t('EMISOR','ISSUER');const b=states[2].querySelector('b');b.textContent=stateText(b.textContent);}
    if(states[3]){
      states[3].querySelector('span').textContent=t('HISTORIAL','HISTORY');
      const b=states[3].querySelector('b');const match=String(b.textContent||'').match(/\d+/);const count=match?Number(match[0]):0;
      b.textContent=document.documentElement.lang==='en'?`${count} ${count===1?'EVENT':'EVENTS'}`:`${count} ${count===1?'EVENTO':'EVENTOS'}`;
    }

    const issuerStatus=host.querySelector('.publicAssetIssuerStatus');
    if(issuerStatus)issuerStatus.textContent=stateText(issuerStatus.textContent);

    const qrTitle=host.querySelector('.publicAssetQrCard b');
    const qrSmall=host.querySelector('.publicAssetQrCard small');
    if(qrTitle)qrTitle.textContent=t('Verificar este Passport','Verify this Passport');
    if(qrSmall)qrSmall.textContent=t('Consulta pública · sin wallet','Public lookup · no wallet');
    return true;
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(()=>{
    const shell=document.querySelector('#publicAssetPage .publicAssetShell');if(shell){delete shell.dataset.evoV241;delete shell.dataset.evoV242;}enhance();
  },80));
  setTimeout(enhance,100);
})();
