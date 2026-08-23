'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const staleButton=document.getElementById('evoBackTop');
  if(staleButton)staleButton.remove();
  document.querySelectorAll('.evoFooterTop').forEach(node=>node.remove());

  const myEvoUrl=()=>{
    const url=new URL(location.href);
    const lang=document.documentElement.lang==='en'?'en':'es';
    url.search='';
    url.searchParams.set('v','20260821-v275');
    if(lang==='en')url.searchParams.set('lang','en');
    url.hash='myEvo';
    return url.toString();
  };

  const atMyEvo=()=>String(location.hash||'').toLowerCase()==='#myevo'&&!new URLSearchParams(location.search).has('seal');
  const myEvoTop=()=>{
    const node=document.getElementById('myEvo');
    if(!node)return 0;
    const nav=document.querySelector('nav');
    const offset=(nav?.offsetHeight||76)+12;
    return Math.max(0,node.getBoundingClientRect().top+window.scrollY-offset);
  };
  const goMyEvo=()=>{
    if(atMyEvo()&&document.getElementById('myEvo')){
      window.scrollTo({top:myEvoTop(),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'});
      return;
    }
    location.assign(myEvoUrl());
  };

  const button=document.createElement('button');
  button.id='evoBackTop';
  button.className='evoBackTop';
  button.type='button';
  button.dataset.evoNavVersion='275';
  button.setAttribute('aria-label',t('Volver a Mi EVO','Back to My EVO'));
  button.innerHTML='<span aria-hidden="true">⌂</span><b></b>';
  button.querySelector('b').textContent=t('Mi EVO','My EVO');
  button.onclick=goMyEvo;
  document.body.appendChild(button);

  const footer=document.querySelector('footer .wrap');
  let footerTop=null;
  if(footer){
    footerTop=document.createElement('button');
    footerTop.type='button';
    footerTop.className='evoFooterTop';
    footerTop.dataset.evoNavVersion='275';
    footerTop.textContent=t('⌂ Volver a Mi EVO','⌂ Back to My EVO');
    footerTop.onclick=goMyEvo;
    footer.appendChild(footerTop);
  }

  let ticking=false;
  const update=()=>{
    ticking=false;
    button.setAttribute('aria-label',t('Volver a Mi EVO','Back to My EVO'));
    button.querySelector('b').textContent=t('Mi EVO','My EVO');
    if(footerTop)footerTop.textContent=t('⌂ Volver a Mi EVO','⌂ Back to My EVO');
    const origin=atMyEvo()?myEvoTop():0;
    const threshold=atMyEvo()?420:560;
    const visible=window.scrollY-origin>threshold;
    button.classList.toggle('visible',visible);
    button.setAttribute('aria-hidden',visible?'false':'true');
    button.tabIndex=visible?0:-1;
  };
  const schedule=()=>{if(ticking)return;ticking=true;requestAnimationFrame(update)};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('load',()=>setTimeout(schedule,120),{once:true});
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(schedule,80));
  setTimeout(schedule,250);
  update();
})();
