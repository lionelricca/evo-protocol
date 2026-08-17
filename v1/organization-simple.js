(()=>{
  const TZ_COUNTRY={'America/Santiago':'CL','America/Punta_Arenas':'CL','Pacific/Easter':'CL','America/Argentina/Buenos_Aires':'AR','America/Sao_Paulo':'BR','America/Mexico_City':'MX','America/Bogota':'CO','America/Lima':'PE','America/Montevideo':'UY','Europe/Madrid':'ES','Europe/Rome':'IT','Europe/Paris':'FR','Europe/Berlin':'DE','Europe/London':'GB','America/Toronto':'CA','America/Vancouver':'CA','Australia/Sydney':'AU','Pacific/Auckland':'NZ','Asia/Kolkata':'IN','Asia/Tokyo':'JP','Asia/Seoul':'KR','Asia/Shanghai':'CN','Asia/Singapore':'SG','Asia/Dubai':'AE'};
  const wait=fn=>{let n=0;const t=setInterval(()=>{if(fn()||++n>80)clearInterval(t)},250)};
  const clean=v=>String(v||'').normalize('NFKC').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  function countryName(code){try{return new Intl.DisplayNames([navigator.language||'es'],{type:'region'}).of(code)||code}catch{return code}}
  function contextCountry(){
    try{if(typeof account!=='undefined'&&account){const saved=localStorage.getItem(`evo-country:${account.toLowerCase()}`);if(saved)return saved}}catch{}
    try{const region=new Intl.Locale(navigator.language||'').region;if(region)return region}catch{}
    try{return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone]||''}catch{return ''}
  }
  function validRut(raw){const v=clean(raw);if(!/^\d{7,8}[0-9K]$/.test(v))return false;const body=v.slice(0,-1),dv=v.slice(-1);let s=0,m=2;for(let i=body.length-1;i>=0;i--){s+=Number(body[i])*m;m=m===7?2:m+1}const r=11-(s%11),e=r===11?'0':r===10?'K':String(r);return dv===e}
  function validCuit(raw){const v=clean(raw);if(!/^\d{11}$/.test(v))return false;const w=[5,4,3,2,7,6,5,4,3,2];let s=0;for(let i=0;i<10;i++)s+=Number(v[i])*w[i];let d=11-(s%11);if(d===11)d=0;else if(d===10)d=9;return d===Number(v[10])}
  function cnpjDigit(base){let size=base.length,pos=size-7,sum=0;for(let i=0;i<size;i++){sum+=Number(base[i])*pos--;if(pos<2)pos=9}const r=sum%11;return r<2?'0':String(11-r)}
  function validCnpj(raw){const v=clean(raw);if(!/^\d{14}$/.test(v)||/^(\d)\1{13}$/.test(v))return false;return cnpjDigit(v.slice(0,12))===v[12]&&cnpjDigit(v.slice(0,13))===v[13]}
  function detectId(raw){if(validRut(raw))return{country:'CL',type:'RUT',label:'Chile · RUT'};if(validCuit(raw))return{country:'AR',type:'CUIT',label:'Argentina · CUIT'};if(validCnpj(raw))return{country:'BR',type:'CNPJ',label:'Brasil · CNPJ'};return null}
  function setInternalCountry(code,type=''){
    const c=document.getElementById('organizationCountry'),r=document.getElementById('organizationRegistryType');if(!c||!code)return;
    c.value=code;c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));if(r&&type)r.value=type;
    try{if(typeof account!=='undefined'&&account)localStorage.setItem(`evo-country:${account.toLowerCase()}`,code)}catch{}
  }
  async function walletSummary(){
    const out=document.getElementById('organizationAutofillState');if(!out||typeof account==='undefined'||!account)return;
    const short=`${account.slice(0,6)}…${account.slice(-4)}`;
    out.innerHTML=`<span class="status ok">✓ WALLET CARGADA</span><span class="mono">${short}</span>`;
    try{if(typeof fetchIssuerProfile==='function'){const p=await fetchIssuerProfile(account);if(p?.display_name)out.innerHTML=`<span class="status ok">✓ WALLET + PERFIL</span><b>${esc(p.display_name)}</b><span class="mono">${short}</span>`}}catch{}
  }
  function askCountryOnlyIfNeeded(){
    const box=document.getElementById('organizationCountryFallback');if(box)box.hidden=false;
  }
  function simplify(){
    const form=document.getElementById('organizationForm'),country=document.getElementById('organizationCountry'),official=document.getElementById('organizationRegistryReference');if(!form||!country||!official||document.getElementById('organizationSimpleReady'))return false;
    const marker=document.createElement('span');marker.id='organizationSimpleReady';marker.hidden=true;form.appendChild(marker);
    const countryLabel=country.closest('label');if(countryLabel)countryLabel.style.display='none';
    const details=form.querySelector('details');if(details)details.style.display='none';
    const notices=[...form.querySelectorAll('.passportNotice')];notices.forEach((n,i)=>{if(n.id!=='organizationAutofillState'&&i>0)n.style.display='none'});
    const panel=form.closest('.domainPanel');const h=panel?.querySelector('h3');if(h)h.textContent='Verificar organización';const intro=panel?.querySelector('h3 + p');if(intro)intro.textContent='EVO completa automáticamente los datos vinculados a tu wallet. Escribí sólo el identificador oficial.';
    official.closest('label').classList.add('full');official.placeholder='Identificador oficial';
    const state=document.createElement('div');state.id='organizationIdState';state.className='full';state.style.minHeight='28px';official.closest('label').insertAdjacentElement('afterend',state);
    const fallback=document.createElement('div');fallback.id='organizationCountryFallback';fallback.className='full';fallback.hidden=true;fallback.innerHTML='<label>País<select id="organizationCountrySelect"><option value="">Seleccionar país</option><option value="CL">Chile</option><option value="AR">Argentina</option><option value="BR">Brasil</option><option value="MX">México</option><option value="CO">Colombia</option><option value="PE">Perú</option><option value="UY">Uruguay</option><option value="ES">España</option><option value="US">Estados Unidos</option><option value="GB">Reino Unido</option><option value="CA">Canadá</option><option value="DE">Alemania</option><option value="FR">Francia</option><option value="IT">Italia</option><option value="AU">Australia</option><option value="NZ">Nueva Zelanda</option><option value="IN">India</option><option value="JP">Japón</option><option value="SG">Singapur</option><option value="AE">Emiratos Árabes Unidos</option></select></label>';
    state.insertAdjacentElement('afterend',fallback);
    const select=fallback.querySelector('select');select.onchange=()=>{if(select.value){setInternalCountry(select.value,typeof suggestedRegistryType==='function'?suggestedRegistryType(select.value):'Registro oficial');state.innerHTML=`<span class="status ok">✓ ${countryName(select.value)}</span>`;fallback.hidden=true}};
    official.addEventListener('input',()=>{const d=detectId(official.value);if(d){setInternalCountry(d.country,d.type);state.innerHTML=`<span class="status ok">✓ ${d.label} reconocido</span>`;fallback.hidden=true}else{state.textContent=''}});
    const btn=form.querySelector('button[type="submit"]');if(btn)btn.textContent='Verificar organización';
    form.addEventListener('submit',e=>{if(!country.value){const d=detectId(official.value);if(d)setInternalCountry(d.country,d.type);else{const c=contextCountry();if(c)setInternalCountry(c,typeof suggestedRegistryType==='function'?suggestedRegistryType(c):'Registro oficial');else{e.preventDefault();e.stopImmediatePropagation();askCountryOnlyIfNeeded();state.innerHTML='<span class="status warn">Elegí el país para continuar</span>'}}}},true);
    const initial=contextCountry();if(initial)setInternalCountry(initial,typeof suggestedRegistryType==='function'?suggestedRegistryType(initial):'Registro oficial');
    walletSummary();setInterval(walletSummary,1500);return true;
  }
  wait(simplify);
})();
