'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;

  document.getElementById('evoBackTop')?.remove();
  document.getElementById('evoMyEvoReturn')?.remove();
  document.querySelectorAll('.evoFooterTop').forEach(node=>node.remove());

  const destination=()=>{
    const url=new URL(location.href);
    const lang=document.documentElement.lang==='en'?'en':'es';
    url.search='';
    url.searchParams.set('v','20260821-v276');
    if(lang==='en')url.searchParams.set('lang','en');
    url.hash='myEvo';
    return url.toString();
  };

  const alreadyInMyEvo=()=>String(location.hash||'').toLowerCase()==='#myevo'&&!new URLSearchParams(location.search).has('seal');
  const myEvoTop=()=>{
    const node=document.getElementById('myEvo');
    if(!node)return 0;
    const nav=document.querySelector('nav');
    return Math.max(0,node.getBoundingClientRect().top+window.scrollY-(nav?.offsetHeight||76)-12);
  };

  const goMyEvo=()=>{
    if(alreadyInMyEvo()&&document.getElementById('myEvo')){
      window.scrollTo({top:myEvoTop(),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'});
      return;
    }
    location.assign(destination());
  };

  const button=document.createElement('button');
  button.id='evoMyEvoReturn';
  button.className='evoBackTop visible';
  button.type='button';
  button.dataset.evoNavVersion='276';
  button.setAttribute('aria-label',t('Volver a Mi EVO','Back to My EVO'));
  button.innerHTML=`<span aria-hidden="true">⌂</span><b>${t('Mi EVO','My EVO')}</b>`;
  button.onclick=goMyEvo;
  document.body.appendChild(button);

  const refreshLabel=()=>{
    button.setAttribute('aria-label',t('Volver a Mi EVO','Back to My EVO'));
    const label=button.querySelector('b');
    if(label)label.textContent=t('Mi EVO','My EVO');
  };
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(refreshLabel,50));
})();
