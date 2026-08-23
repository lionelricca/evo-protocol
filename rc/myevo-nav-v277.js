'use strict';

(()=>{
  const isEnglish=()=>document.documentElement.lang==='en';
  const t=(es,en)=>isEnglish()?en:es;

  const removeLegacy=()=>{
    document.getElementById('evoBackTop')?.remove();
    document.getElementById('evoMyEvoReturn')?.remove();
    document.querySelectorAll('.evoFooterTop').forEach(node=>node.remove());
  };

  const destination=()=>{
    const url=new URL(location.href);
    const requested=new URLSearchParams(location.search).get('lang');
    const lang=requested==='en'||requested==='es'?requested:(isEnglish()?'en':'es');
    url.search='';
    url.searchParams.set('v','20260821-v277');
    if(lang==='en')url.searchParams.set('lang','en');
    url.hash='myEvo';
    return url.toString();
  };

  const atMyEvo=()=>String(location.hash||'').toLowerCase()==='#myevo'&&!new URLSearchParams(location.search).has('seal');
  const myEvoTop=()=>{
    const node=document.getElementById('myEvo');
    if(!node)return 0;
    const nav=document.querySelector('nav');
    return Math.max(0,node.getBoundingClientRect().top+window.scrollY-(nav?.offsetHeight||76)-12);
  };

  const goMyEvo=()=>{
    if(atMyEvo()&&document.getElementById('myEvo')){
      window.scrollTo({top:myEvoTop(),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'});
      return;
    }
    location.assign(destination());
  };

  removeLegacy();
  document.getElementById('evoMyEvoHome')?.remove();

  const brand=document.querySelector('nav .brand');
  if(brand){
    brand.href=destination();
    brand.setAttribute('aria-label',t('Ir a Mi EVO','Go to My EVO'));
    brand.onclick=event=>{event.preventDefault();goMyEvo();};
  }

  const button=document.createElement('button');
  button.id='evoMyEvoHome';
  button.className='evoBackTop visible';
  button.type='button';
  button.dataset.evoNavVersion='277';
  button.innerHTML='<span aria-hidden="true">⌂</span><b></b>';
  button.onclick=goMyEvo;
  document.body.appendChild(button);

  const refresh=()=>{
    button.setAttribute('aria-label',t('Volver a Mi EVO','Back to My EVO'));
    button.querySelector('b').textContent=t('Mi EVO','My EVO');
    if(brand)brand.setAttribute('aria-label',t('Ir a Mi EVO','Go to My EVO'));
  };
  refresh();

  // A cached legacy loader may still try to recreate the old Passport/Inicio button.
  // Keep one navigation control only.
  const guard=new MutationObserver(()=>removeLegacy());
  guard.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',()=>setTimeout(removeLegacy,300),{once:true});
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(refresh,40));

  window.evoGoMyEvo=goMyEvo;
})();
