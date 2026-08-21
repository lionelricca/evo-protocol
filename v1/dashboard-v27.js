'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  let activeSeal='';
  let activeTitle='';

  const fullSeal=card=>String(card?.querySelector('.myEvoSealId')?.dataset?.fullSeal||card?.querySelector('.myEvoSealId')?.title||card?.querySelector('.myEvoSealId')?.textContent||'').trim().toUpperCase();
  const titleFor=card=>String(card?.querySelector('h4')?.textContent||t('Activo EVO','EVO asset')).trim();
  const isManageable=card=>{
    const badge=card?.querySelector('.myEvoBadge');
    return Boolean(badge&&(badge.classList.contains('is-owned')||badge.classList.contains('is-received'))&&!badge.classList.contains('is-transferred'));
  };

  function scrollToNode(node){
    if(!node)return;
    const nav=document.querySelector('nav');
    const offset=(nav?.offsetHeight||76)+14;
    const top=Math.max(0,node.getBoundingClientRect().top+window.scrollY-offset);
    window.scrollTo({top,behavior:'smooth'});
  }

  function ensureManageBar(){
    const section=document.getElementById('passport');
    if(!section)return null;
    let bar=section.querySelector('.evoManageBar');
    if(bar)return bar;
    bar=document.createElement('div');
    bar.className='evoManageBar';
    bar.hidden=true;
    const reference=section.querySelector('.grid');
    if(reference)section.insertBefore(bar,reference);else section.prepend(bar);
    return bar;
  }

  function renderManageBar(){
    const bar=ensureManageBar();if(!bar||!activeSeal)return;
    bar.hidden=false;
    bar.textContent='';

    const copy=document.createElement('div');copy.className='evoManageCopy';
    const eye=document.createElement('span');eye.className='evoManageEyebrow';eye.textContent=t('GESTIONANDO PASSPORT','MANAGING PASSPORT');
    const title=document.createElement('b');title.textContent=activeTitle||t('Activo EVO','EVO asset');
    const id=document.createElement('code');id.textContent=activeSeal;
    copy.append(eye,title,id);

    const actions=document.createElement('div');actions.className='evoManageActions';
    const eventBtn=document.createElement('button');eventBtn.type='button';eventBtn.className='btn evoManageEvent';eventBtn.textContent=t('Registrar evento','Record event');
    eventBtn.onclick=()=>{
      document.querySelector('.evoManageEvent')?.classList.add('active');
      document.querySelector('.evoManageTransfer')?.classList.remove('active');
      const form=document.getElementById('passportEventForm');scrollToNode(form);setTimeout(()=>document.getElementById('passportType')?.focus(),350);
    };
    const transferBtn=document.createElement('button');transferBtn.type='button';transferBtn.className='btn evoManageTransfer';transferBtn.textContent=t('Transferir propiedad','Transfer ownership');
    transferBtn.onclick=()=>{
      document.querySelector('.evoManageTransfer')?.classList.add('active');
      document.querySelector('.evoManageEvent')?.classList.remove('active');
      const panel=document.querySelector('.transferPanel');scrollToNode(panel);setTimeout(()=>document.getElementById('transferToWallet')?.focus(),350);
    };
    const back=document.createElement('button');back.type='button';back.className='btn evoManageBack';back.textContent=t('Volver a Mi EVO','Back to My EVO');back.onclick=()=>{location.hash='myEvo';setTimeout(()=>scrollToNode(document.getElementById('myEvo')),0)};
    actions.append(eventBtn,transferBtn,back);
    bar.append(copy,actions);
  }

  function manage(card){
    const seal=fullSeal(card);if(!seal)return;
    activeSeal=seal;activeTitle=titleFor(card);
    const input=document.getElementById('passportSealId');if(input)input.value=seal;
    const transfer=document.getElementById('transferToWallet');if(transfer)transfer.value='';
    history.replaceState(null,'',`${location.pathname}${location.search}#passport`);
    renderManageBar();
    const section=document.getElementById('passport');scrollToNode(section);
    const load=document.getElementById('passportLoadBtn');if(load)setTimeout(()=>load.click(),220);
  }

  function decorateCard(card){
    if(!card||card.dataset.evoV27==='true')return;
    const actions=card.querySelector('.myEvoAssetActions');
    if(!actions)return;
    if(isManageable(card)){
      const manageBtn=document.createElement('button');
      manageBtn.type='button';manageBtn.className='btn myEvoManageAsset';manageBtn.textContent=t('Gestionar','Manage');
      manageBtn.setAttribute('aria-label',t(`Gestionar ${titleFor(card)}`,`Manage ${titleFor(card)}`));
      manageBtn.onclick=()=>manage(card);
      const copy=actions.querySelector('.myEvoCopyLink');
      if(copy)actions.insertBefore(manageBtn,copy);else actions.append(manageBtn);
    }
    card.dataset.evoV27='true';
  }

  function scan(){
    if(document.body.classList.contains('evoPublicAssetMode'))return;
    document.querySelectorAll('.myEvoAssetV253').forEach(decorateCard);
    if(activeSeal)renderManageBar();
  }

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})};
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',event=>{if(event.target.closest('.myEvoTab'))setTimeout(schedule,0)});
  window.addEventListener('evo:wallet-connected',()=>setTimeout(schedule,100));
  schedule();
})();
