'use strict';

(()=>{
  const stylesheet=document.createElement('link');
  stylesheet.rel='stylesheet';stylesheet.href='./proof-card.css?v=20260821-v23-proof-card';stylesheet.dataset.evoProofCardStyle='true';
  if(!document.querySelector('link[data-evo-proof-card-style]'))document.head.appendChild(stylesheet);

  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const text=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;node.textContent=value;return node};
  function values(root){
    const map=new Map();
    root.querySelectorAll('.kv').forEach(row=>{
      const key=row.children[0]?.textContent?.trim();
      const value=row.children[1]?.textContent?.trim();
      if(key)map.set(key,value||'');
    });
    return map;
  }
  function publicUrl(root){
    const url=root.querySelector('.qrUrl')?.textContent?.trim();
    if(url)return url;
    const id=values(root).get('Seal ID');
    if(!id)return location.href;
    const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('seal',id);u.hash='verify';return u.toString();
  }
  function addState(grid,label,status){
    const item=document.createElement('div');item.className='proofState';item.append(text('b','',label),text('small','',status));grid.appendChild(item);
  }
  function decorate(root,mode){
    if(!root||root.dataset.proofCardReady==='1'||!root.querySelector('.qrCard')||root.classList.contains('empty'))return;
    const data=values(root),id=data.get('Seal ID')||'',title=data.get('Nombre')||t('Activo verificado','Verified asset');
    if(!id)return;
    root.dataset.proofCardReady='1';root.classList.add('proofCardResult');

    const hero=document.createElement('div');hero.className='proofCardHero';
    const copy=document.createElement('div');
    copy.append(text('div','proofCardEyebrow',mode==='create'?t('EVO PROOF · REGISTRO COMPLETADO','EVO PROOF · REGISTRATION COMPLETE'):t('EVO VERIFY · REGISTRO PÚBLICO','EVO VERIFY · PUBLIC RECORD')),
      text('h3','proofCardTitle',title),text('span','proofCardId',id));
    hero.append(copy,text('div','proofCardMark','EVO'));

    const states=document.createElement('div');states.className='proofStateGrid';
    addState(states,'PROOF','REGISTERED');
    addState(states,'SIGNATURE','WALLET SIGNED');
    addState(states,'INTEGRITY','SHA-256');
    addState(states,'VERIFY','PUBLIC');

    const foot=document.createElement('div');foot.className='proofCardFootnote';
    const strong=document.createElement('b');strong.textContent=t('Qué prueba EVO: ','What EVO proves: ');
    foot.append(strong,document.createTextNode(t('registro, firma, integridad de datos e historial verificable. La autenticidad física depende de la evidencia y del emisor.','registration, signature, data integrity and verifiable history. Physical authenticity depends on the evidence and issuer.')));

    const actions=document.createElement('div');actions.className='proofCardActions';
    const share=document.createElement('button');share.type='button';share.className='btn primary';share.textContent=t('Compartir Proof','Share Proof');
    share.onclick=async()=>{
      const url=publicUrl(root),payload={title:`EVO Proof · ${title}`,text:`EVO Proof ${id}`,url};
      try{if(navigator.share)await navigator.share(payload);else{await navigator.clipboard.writeText(url);toast(t('Enlace público copiado','Public link copied'));}}catch(e){if(e?.name!=='AbortError')toast(t('No se pudo compartir el Proof','Could not share the Proof'));}
    };
    const copyLink=document.createElement('button');copyLink.type='button';copyLink.className='btn';copyLink.textContent=t('Copiar enlace','Copy link');copyLink.onclick=()=>navigator.clipboard.writeText(publicUrl(root)).then(()=>toast(t('Enlace público copiado','Public link copied')));
    const print=document.createElement('button');print.type='button';print.className='btn gold';print.textContent=t('Imprimir Proof','Print Proof');print.onclick=()=>{document.body.dataset.evoPrintTarget=root.id;window.print();setTimeout(()=>delete document.body.dataset.evoPrintTarget,250)};
    actions.append(share,copyLink,print);

    root.prepend(states);root.prepend(hero);root.append(foot,actions);
  }
  function scan(){decorate(document.getElementById('createResult'),'create');decorate(document.getElementById('verifyResult'),'verify');}
  const observer=new MutationObserver(scan);['createResult','verifyResult'].forEach(id=>{const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:true})});
  window.addEventListener('afterprint',()=>delete document.body.dataset.evoPrintTarget);
  scan();
})();
