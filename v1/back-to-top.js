'use strict';

(()=>{
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // A cached older loader may have already created V2.7.1. Replace the DOM node
  // instead of reusing it so stale scroll/click listeners keep references only
  // to the detached old control and cannot overwrite this version.
  const staleButton=document.getElementById('evoBackTop');
  if(staleButton)staleButton.remove();
  document.querySelectorAll('.evoFooterTop').forEach(node=>node.remove());

  const contextualTarget=()=>{
    const hash=String(location.hash||'').toLowerCase();
    const publicMode=document.body.classList.contains('evoPublicAssetMode')||new URLSearchParams(location.search).has('seal');
    if(publicMode){
      const node=document.getElementById('publicAssetPage')||document.getElementById('verify');
      if(node)return {kind:'passport',node};
    }
    if(hash==='#myevo'||document.getElementById('myEvo')?.classList.contains('ready')){
      const node=document.getElementById('myEvo');
      if(node)return {kind:'myevo',node};
    }
    return {kind:'page',node:null};
  };

  const targetTop=context=>{
    if(!context.node)return 0;
    const nav=document.querySelector('nav');
    const offset=(nav?.offsetHeight||76)+12;
    return Math.max(0,context.node.getBoundingClientRect().top+window.scrollY-offset);
  };

  const contextCopy=context=>{
    if(context.kind==='myevo')return {
      label:t('Volver al inicio de Mi EVO','Back to My EVO start'),
      short:t('Mi EVO','My EVO'),
      footer:t('↑ Volver a Mi EVO','↑ Back to My EVO')
    };
    if(context.kind==='passport')return {
      label:t('Volver al inicio del Passport','Back to Passport start'),
      short:'Passport',
      footer:t('↑ Volver al Passport','↑ Back to Passport')
    };
    return {
      label:t('Volver al inicio','Back to top'),
      short:t('Inicio','Top'),
      footer:t('↑ Volver al inicio','↑ Back to top')
    };
  };

  const button=document.createElement('button');
  button.id='evoBackTop';
  button.className='evoBackTop';
  button.type='button';
  button.dataset.evoNavVersion='273';
  button.innerHTML='<span aria-hidden="true">↑</span><b></b>';
  document.body.appendChild(button);

  const footer=document.querySelector('footer .wrap');
  let footerTop=null;
  if(footer){
    footerTop=document.createElement('button');
    footerTop.type='button';
    footerTop.className='evoFooterTop';
    footerTop.dataset.evoNavVersion='273';
    footer.appendChild(footerTop);
  }

  const scrollToContext=()=>{
    const context=contextualTarget();
    window.scrollTo({top:targetTop(context),behavior:reduced()?'auto':'smooth'});
  };
  button.onclick=scrollToContext;
  if(footerTop)footerTop.onclick=scrollToContext;

  let ticking=false;
  const update=()=>{
    ticking=false;
    const context=contextualTarget();
    const copy=contextCopy(context);
    button.setAttribute('aria-label',copy.label);
    button.querySelector('b').textContent=copy.short;
    if(footerTop)footerTop.textContent=copy.footer;

    const origin=targetTop(context);
    const threshold=context.kind==='page'?560:430;
    const visible=window.scrollY-origin>threshold;
    button.classList.toggle('visible',visible);
    button.setAttribute('aria-hidden',visible?'false':'true');
    button.tabIndex=visible?0:-1;
  };
  const schedule=()=>{if(ticking)return;ticking=true;requestAnimationFrame(update)};

  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('evo:wallet-connected',()=>setTimeout(schedule,100));
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(schedule,80));
  window.addEventListener('load',()=>setTimeout(schedule,120),{once:true});
  setTimeout(schedule,250);
  update();
})();
