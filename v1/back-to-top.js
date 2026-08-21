'use strict';

(()=>{
  if(document.getElementById('evoBackTop'))return;
  const t=(es,en)=>document.documentElement.lang==='en'?en:es;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const button=document.createElement('button');
  button.id='evoBackTop';
  button.className='evoBackTop';
  button.type='button';
  button.setAttribute('aria-label',t('Volver al inicio','Back to top'));
  button.innerHTML='<span aria-hidden="true">↑</span><b></b>';
  button.querySelector('b').textContent=t('Inicio','Top');
  button.onclick=()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'});
  document.body.appendChild(button);

  const footer=document.querySelector('footer .wrap');
  if(footer&&!footer.querySelector('.evoFooterTop')){
    const footerTop=document.createElement('button');
    footerTop.type='button';
    footerTop.className='evoFooterTop';
    footerTop.textContent=t('↑ Volver al inicio','↑ Back to top');
    footerTop.onclick=button.onclick;
    footer.appendChild(footerTop);
  }

  let ticking=false;
  const update=()=>{
    ticking=false;
    const visible=window.scrollY>560;
    button.classList.toggle('visible',visible);
    button.setAttribute('aria-hidden',visible?'false':'true');
    button.tabIndex=visible?0:-1;
  };
  const schedule=()=>{if(ticking)return;ticking=true;requestAnimationFrame(update)};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(()=>{
    button.setAttribute('aria-label',t('Volver al inicio','Back to top'));
    button.querySelector('b').textContent=t('Inicio','Top');
    const footerTop=document.querySelector('.evoFooterTop');
    if(footerTop)footerTop.textContent=t('↑ Volver al inicio','↑ Back to top');
  },60));
  update();
})();
