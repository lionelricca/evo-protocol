'use strict';

(()=>{
  document.documentElement.setAttribute('translate','no');
  document.documentElement.classList.add('notranslate');
  if(!document.querySelector('meta[name="google"][content="notranslate"]')){
    const meta=document.createElement('meta');
    meta.name='google';
    meta.content='notranslate';
    document.head.appendChild(meta);
  }

  const ensureMyEvoReturn=()=>{
    if(document.querySelector('script[data-evo-myevo-return-v276]'))return;
    const script=document.createElement('script');
    script.src='./myevo-return-v276.js?v=20260821-v276-fixed';
    script.async=false;
    script.dataset.evoMyevoReturnV276='true';
    document.head.appendChild(script);
  };
  ensureMyEvoReturn();

  const selector=document.getElementById('languageSelect');
  if(!selector)return;

  const current=()=>document.documentElement.lang==='en'?'en':'es';
  selector.value=current();

  selector.addEventListener('change',event=>{
    event.stopImmediatePropagation();
    const lang=event.target.value==='en'?'en':'es';
    localStorage.setItem('evo-language',lang);
    const url=new URL(location.href);
    url.searchParams.set('lang',lang);
    url.searchParams.set('v','20260821-v276');
    location.assign(url.toString());
  },true);
})();
