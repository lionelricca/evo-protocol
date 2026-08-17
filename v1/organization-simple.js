(()=>{
  const ISO_COUNTRIES=`AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');
  const wait=(fn)=>{let n=0;const t=setInterval(()=>{if(fn()||++n>80)clearInterval(t)},250)};
  function countryName(code){
    try{return new Intl.DisplayNames([navigator.language||'es'],{type:'region'}).of(code)||code}catch{return code}
  }
  function browserRegion(){
    try{return new Intl.Locale(navigator.language||'').region||''}catch{return ''}
  }
  function syncWalletState(){
    const out=document.getElementById('organizationAutofillState');
    if(!out||typeof account==='undefined'||!account)return;
    const short=`${account.slice(0,6)}…${account.slice(-4)}`;
    out.innerHTML=`<span class="status ok">WALLET CONNECTED</span><p>Wallet <span class="mono">${short}</span> cargada. EVO usa la wallet para identificar al solicitante y completa automáticamente todo lo que ya conoce.</p>`;
    if(typeof fetchIssuerProfile==='function'){
      fetchIssuerProfile(account).then(p=>{
        if(!p||!document.getElementById('organizationAutofillState'))return;
        out.innerHTML=`<span class="status ok">WALLET PROFILE LOADED</span><p>Wallet <span class="mono">${short}</span>${p.display_name?` · Perfil firmado: <b>${esc(p.display_name)}</b>`:''}. La wallet identifica al solicitante; el nombre legal de una empresa sólo se confirma con evidencia independiente.</p>`;
      }).catch(()=>{});
    }
  }
  function simplify(){
    const form=document.getElementById('organizationForm');
    const hiddenCountry=document.getElementById('organizationCountry');
    const officialId=document.getElementById('organizationRegistryReference');
    if(!form||!hiddenCountry||!officialId||document.getElementById('organizationCountryFull'))return false;

    const label=hiddenCountry.closest('label');
    hiddenCountry.type='hidden';
    const select=document.createElement('select');
    select.id='organizationCountryFull';
    select.setAttribute('aria-label','País');
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Seleccionar país';select.appendChild(placeholder);
    ISO_COUNTRIES.map(code=>({code,name:countryName(code)})).sort((a,b)=>a.name.localeCompare(b.name,navigator.language||'es')).forEach(({code,name})=>{
      const o=document.createElement('option');o.value=code;o.textContent=name;select.appendChild(o);
    });
    label.insertBefore(select,hiddenCountry);
    const initial=(hiddenCountry.value||browserRegion()||'').toUpperCase();
    if(ISO_COUNTRIES.includes(initial)){select.value=initial;hiddenCountry.value=initial;hiddenCountry.dispatchEvent(new Event('input',{bubbles:true}));hiddenCountry.dispatchEvent(new Event('change',{bubbles:true}));}
    select.addEventListener('change',()=>{
      hiddenCountry.value=select.value;
      hiddenCountry.dispatchEvent(new Event('input',{bubbles:true}));
      hiddenCountry.dispatchEvent(new Event('change',{bubbles:true}));
    });

    officialId.placeholder='Ej. RUT, CUIT, CNPJ, RFC, VAT…';
    const intro=form.closest('.domainPanel')?.querySelector('h3');if(intro)intro.textContent='Verificar organización';
    const p=form.closest('.domainPanel')?.querySelector('h3 + p');if(p)p.textContent='EVO toma la wallet y el perfil automáticamente. Confirmá el país y escribí sólo el identificador oficial.';
    const details=form.querySelector('details');if(details)details.querySelector('summary').textContent='Datos adicionales (sólo si hacen falta)';
    const btn=form.querySelector('button[type="submit"]');if(btn)btn.textContent='Verificar organización';

    syncWalletState();
    setInterval(syncWalletState,1200);
    const walletBtn=document.getElementById('walletBtn');if(walletBtn)walletBtn.addEventListener('click',()=>{setTimeout(syncWalletState,400);setTimeout(syncWalletState,1200)});
    return true;
  }
  wait(simplify);
})();
