'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const normalize=value=>String(value||'').trim().toLowerCase();
  const glyphFor=value=>{
    const type=normalize(value);
    if(type.includes('imagen')||type.includes('image')||type.includes('foto'))return '◫';
    if(type.includes('document')||type.includes('informe'))return '≡';
    if(type.includes('video'))return '▷';
    if(type.includes('certif'))return '✓';
    if(type.includes('producto')||type.includes('equipo')||type.includes('asset'))return '◇';
    return '◆';
  };
  const typeClass=value=>{
    const type=normalize(value);
    if(type.includes('imagen')||type.includes('image')||type.includes('foto'))return 'is-image';
    if(type.includes('document')||type.includes('informe'))return 'is-document';
    if(type.includes('video'))return 'is-video';
    if(type.includes('certif'))return 'is-certificate';
    return 'is-asset';
  };
  const relationClass=value=>{
    const text=normalize(value);
    if(text.includes('recib')||text.includes('received'))return 'is-received';
    if(text.includes('transfer'))return 'is-transferred';
    return 'is-owned';
  };
  const shortSeal=value=>{
    const seal=String(value||'');
    if(seal.length<22)return seal;
    return `${seal.slice(0,12)}…${seal.slice(-8)}`;
  };

  function decorateCard(card){
    if(!card||card.dataset.evoV253==='true')return;
    const top=card.querySelector('.myEvoAssetTop');
    const copy=card.querySelector('.myEvoAssetCopy');
    const typeNode=card.querySelector('.myEvoAssetType');
    const badge=card.querySelector('.myEvoBadge');
    const sealNode=card.querySelector('.myEvoSealId');
    if(!top||!copy)return;

    const type=typeNode?.textContent||'';
    const identity=document.createElement('div');
    identity.className='myEvoAssetIdentity';
    const icon=document.createElement('span');
    icon.className=`myEvoAssetIcon ${typeClass(type)}`;
    icon.textContent=glyphFor(type);
    icon.setAttribute('aria-hidden','true');
    top.insertBefore(identity,copy);
    identity.append(icon,copy);

    if(badge)badge.classList.add(relationClass(badge.textContent));
    if(sealNode){
      const full=sealNode.textContent||'';
      sealNode.title=full;
      sealNode.dataset.fullSeal=full;
      sealNode.textContent=shortSeal(full);
    }

    const open=card.querySelector('.myEvoOpenPassport');
    if(open){open.classList.add('myEvoPrimaryAction');open.setAttribute('aria-label',t('Ver Passport público','View public Passport'));}
    const copyLink=card.querySelector('.myEvoCopyLink');
    if(copyLink)copyLink.classList.add('myEvoSecondaryAction');

    card.dataset.search=[
      card.textContent,
      sealNode?.dataset.fullSeal||'',
      type
    ].join(' ').toLowerCase();
    card.classList.add('myEvoAssetV253');
    card.dataset.evoV253='true';
  }

  function applySearch(panel){
    const input=panel?.querySelector('.myEvoSearchInput');
    const grid=panel?.querySelector('.myEvoLibraryGrid');
    if(!input||!grid)return;
    const query=normalize(input.value);
    let visible=0;
    grid.querySelectorAll('.myEvoAssetV252').forEach(card=>{
      const match=!query||String(card.dataset.search||card.textContent||'').includes(query);
      card.hidden=!match;
      if(match)visible+=1;
    });
    let empty=grid.querySelector('.myEvoSearchEmpty');
    if(query&&visible===0){
      if(!empty){
        empty=document.createElement('div');
        empty.className='myEvoSearchEmpty';
        empty.innerHTML=`<b>${t('No encontramos coincidencias','No matches found')}</b><span>${t('Probá con el nombre, tipo, serie o EVO ID.','Try a name, type, serial or EVO ID.')}</span>`;
        grid.appendChild(empty);
      }
    }else if(empty){empty.remove();}
  }

  function enhanceLibrary(){
    if(document.body.classList.contains('evoPublicAssetMode'))return;
    const panel=document.querySelector('.myEvoLibrary');
    if(!panel)return;
    panel.querySelectorAll('.myEvoAssetV252').forEach(decorateCard);

    const head=panel.querySelector('.myEvoLibraryHead');
    const tabs=panel.querySelector('.myEvoTabs');
    if(head&&tabs&&!head.querySelector('.myEvoLibraryControls')){
      const controls=document.createElement('div');
      controls.className='myEvoLibraryControls';
      const search=document.createElement('label');
      search.className='myEvoSearch';
      search.innerHTML=`<span aria-hidden="true">⌕</span><input class="myEvoSearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="${t('Buscar activo, serie o EVO ID…','Search asset, serial or EVO ID…')}" aria-label="${t('Buscar en Biblioteca EVO','Search EVO Library')}">`;
      head.appendChild(controls);
      controls.append(search,tabs);
      search.querySelector('input').addEventListener('input',()=>applySearch(panel));
    }
    applySearch(panel);
  }

  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhanceLibrary();});
  };
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('evo:wallet-connected',()=>setTimeout(schedule,80));
  window.addEventListener('evo:entitlement-updated',()=>setTimeout(schedule,80));
  document.addEventListener('click',event=>{if(event.target.closest('.myEvoTab'))setTimeout(schedule,0)});
  schedule();
})();