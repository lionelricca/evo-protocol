(()=>{
  const ISO_COUNTRIES=`AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');
  const TZ_COUNTRY={
    'America/Santiago':'CL','America/Punta_Arenas':'CL','Pacific/Easter':'CL',
    'America/Argentina/Buenos_Aires':'AR','America/Argentina/Cordoba':'AR','America/Argentina/Mendoza':'AR','America/Argentina/Salta':'AR','America/Argentina/Jujuy':'AR','America/Argentina/Tucuman':'AR','America/Argentina/Ushuaia':'AR','America/Argentina/Catamarca':'AR','America/Argentina/La_Rioja':'AR','America/Argentina/Rio_Gallegos':'AR','America/Argentina/San_Juan':'AR','America/Argentina/San_Luis':'AR',
    'America/Sao_Paulo':'BR','America/Mexico_City':'MX','America/Bogota':'CO','America/Lima':'PE','America/Montevideo':'UY','America/Asuncion':'PY','America/Guayaquil':'EC',
    'Europe/Madrid':'ES','Europe/Rome':'IT','Europe/Paris':'FR','Europe/Berlin':'DE','Europe/London':'GB','Europe/Lisbon':'PT','Europe/Amsterdam':'NL','Europe/Brussels':'BE','Europe/Zurich':'CH','Europe/Vienna':'AT','Europe/Warsaw':'PL','Europe/Prague':'CZ','Europe/Athens':'GR',
    'America/Toronto':'CA','America/Vancouver':'CA','Australia/Sydney':'AU','Australia/Melbourne':'AU','Pacific/Auckland':'NZ','Asia/Kolkata':'IN','Asia/Tokyo':'JP','Asia/Seoul':'KR','Asia/Shanghai':'CN','Asia/Singapore':'SG','Asia/Dubai':'AE'
  };
  const wait=(fn)=>{let n=0;const t=setInterval(()=>{if(fn()||++n>80)clearInterval(t)},250)};
  function countryName(code){try{return new Intl.DisplayNames([navigator.language||'es'],{type:'region'}).of(code)||code}catch{return code}}
  function browserRegion(){try{return new Intl.Locale(navigator.language||'').region||''}catch{return ''}}
  function timezoneRegion(){try{return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone]||''}catch{return ''}}
  function rememberedRegion(){try{return (typeof account!=='undefined'&&account)?localStorage.getItem(`evo-country:${account.toLowerCase()}`)||'':''}catch{return ''}}
  function bestRegion(){return (rememberedRegion()||browserRegion()||timezoneRegion()||'').toUpperCase()}
  function setCountry(code,source='detectado'){
    const hidden=document.getElementById('organizationCountry'),select=document.getElementById('organizationCountryFull'),state=document.getElementById('organizationCountryState');
    code=String(code||'').toUpperCase();if(!hidden||!ISO_COUNTRIES.includes(code))return false;
    hidden.value=code;if(select)select.value=code;
    hidden.dispatchEvent(new Event('input',{bubbles:true}));hidden.dispatchEvent(new Event('change',{bubbles:true}));
    if(state)state.innerHTML=`<span class="status ok">PAÍS ${source.toUpperCase()}</span><b>${countryName(code)}</b><button id="organizationChangeCountry" class="btn" type="button" style="margin-left:10px;padding:6px 10px">Cambiar</button>`;
    if(select)select.style.display='none';
    const change=document.getElementById('organizationChangeCountry');if(change)change.onclick=()=>{if(select){select.style.display='block';select.focus()}if(state)state.innerHTML='<span class="status warn">ELEGÍ EL PAÍS</span>'};
    try{if(typeof account!=='undefined'&&account)localStorage.setItem(`evo-country:${account.toLowerCase()}`,code)}catch{}
    return true;
  }
  function syncWalletState(){
    const out=document.getElementById('organizationAutofillState');if(!out||typeof account==='undefined'||!account)return;
    const short=`${account.slice(0,6)}…${account.slice(-4)}`;
    out.innerHTML=`<span class="status ok">WALLET CONNECTED</span><p>Wallet <span class="mono">${short}</span> cargada. EVO reutiliza automáticamente los datos seguros que ya conoce.</p>`;
    if(typeof fetchIssuerProfile==='function')fetchIssuerProfile(account).then(p=>{
      if(!p||!document.getElementById('organizationAutofillState'))return;
      out.innerHTML=`<span class="status ok">WALLET PROFILE LOADED</span><p>Wallet <span class="mono">${short}</span>${p.display_name?` · Perfil firmado: <b>${esc(p.display_name)}</b>`:''}. La wallet identifica al solicitante; una empresa se confirma con evidencia independiente.</p>`;
    }).catch(()=>{});
    const remembered=rememberedRegion();if(remembered)setCountry(remembered,'recordado');
  }
  function simplify(){
    const form=document.getElementById('organizationForm'),hiddenCountry=document.getElementById('organizationCountry'),officialId=document.getElementById('organizationRegistryReference');
    if(!form||!hiddenCountry||!officialId||document.getElementById('organizationCountryFull'))return false;
    const label=hiddenCountry.closest('label');hiddenCountry.type='hidden';
    const state=document.createElement('div');state.id='organizationCountryState';state.className='passportNotice';state.style.marginBottom='8px';label.insertBefore(state,hiddenCountry);
    const select=document.createElement('select');select.id='organizationCountryFull';select.setAttribute('aria-label','País');
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Seleccionar país';select.appendChild(placeholder);
    ISO_COUNTRIES.map(code=>({code,name:countryName(code)})).sort((a,b)=>a.name.localeCompare(b.name,navigator.language||'es')).forEach(({code,name})=>{const o=document.createElement('option');o.value=code;o.textContent=name;select.appendChild(o)});
    label.insertBefore(select,hiddenCountry);
    select.addEventListener('change',()=>{if(!select.value)return;setCountry(select.value,'confirmado')});
    const initial=(hiddenCountry.value||bestRegion()||'').toUpperCase();
    if(!setCountry(initial,'detectado')){state.innerHTML='<span class="status warn">PAÍS NO DETECTADO</span><span>Elegilo una sola vez.</span>';select.style.display='block'}
    officialId.placeholder='Ej. RUT, CUIT, CNPJ, RFC, VAT…';
    const intro=form.closest('.domainPanel')?.querySelector('h3');if(intro)intro.textContent='Verificar organización';
    const p=form.closest('.domainPanel')?.querySelector('h3 + p');if(p)p.textContent='EVO carga la wallet, el perfil y el país automáticamente cuando puede. Normalmente sólo tenés que escribir el identificador oficial.';
    const details=form.querySelector('details');if(details)details.querySelector('summary').textContent='Datos adicionales (sólo si hacen falta)';
    const btn=form.querySelector('button[type="submit"]');if(btn)btn.textContent='Verificar organización';
    syncWalletState();setInterval(syncWalletState,1500);
    const walletBtn=document.getElementById('walletBtn');if(walletBtn)walletBtn.addEventListener('click',()=>{setTimeout(syncWalletState,400);setTimeout(syncWalletState,1200)});
    return true;
  }
  wait(simplify);
})();
