import fs from 'node:fs';
const SITE='https://carscoutza.com',SUPA='https://ddmvzypiccryjndcwlre.supabase.co',KEY='sb_publishable_D7saHOTE_JhSlMnSgBnIhQ_mOAOUD9s';
const specs=[
 {file:'used-cars-under-r150000.html',label:'Used Cars Under R150,000',kind:'car',max:150000},
 {file:'used-cars-under-r200000.html',label:'Used Cars Under R200,000',kind:'car',max:200000},
 {file:'used-cars-under-r300000.html',label:'Used Cars Under R300,000',kind:'car',max:300000},
 {file:'used-bakkies-under-r300000.html',label:'Used Bakkies Under R300,000',kind:'bakkie',max:300000},
 {file:'used-suvs-under-r350000.html',label:'Used SUVs Under R350,000',kind:'suv',max:350000}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=v=>{const raw=String(v??'').trim().replace(/[^0-9.,]/g,'');if(!raw)return NaN;const normalized=raw.replace(/[.,](?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(normalized);return Number.isFinite(n)?n:NaN};
const title=v=>[v.year,v.make,v.model,v.variant].filter(Boolean).join(' ')||v.title||'Used vehicle';
const bak=/hilux|ranger|d-?max|amarok|np200|navara|triton|pik.?up|bt-50|t60|t90|tunland|p.?series|land cruiser 7[0-9]|colt|rodeo|mahindra scorpio pik/i;
const suv=/fortuner|everest|tucson|sportage|jolion|h6|duster|creta|tiguan|rav4|cx-5|kuga|ecosport|vitara|territory|seltos|corolla cross|qashqai|x-trail|pajero|outlander|hr-v|cr-v|br-v|captur|kicks|santa fe|sorento|grand vitara|jimny|glc|x1|x3|x5|q3|q5|q7|tiggo|proton x|haval h|land rover|discovery|defender|wrangler|compass|renegade|rush|urban cruiser|fronx/i;
const other=/motorcycle|motorbike|bike|quad|trailer|caravan|jet ski|boat|tractor|scooter|atv|\\bhonda\\s+(?:cb|cbr|crf|vfr|vtr)\\s*\\d|\\byamaha\\s+(?:yzf|mt|r[136])\\b|\\bkawasaki\\s+(?:ninja|z\\d|klr)\\b|\\bsuzuki\\s+(?:gsx|gsxr|drz)\\b/i;
function kind(v){const s=[v.make,v.model,v.variant,v.title].filter(Boolean).join(' ');if(other.test(s))return 'other';if(bak.test(s)||/\\b(?:dbl|double|single|super|extra|extended|club|king|space)\\s*cab\\b|\\b(?:bakkie|pickup|pick-up)\\b/i.test(s))return 'bakkie';if(suv.test(s))return 'suv';return 'car'}
const headers={apikey:KEY,Authorization:'Bearer '+KEY};
const res=await fetch(SUPA+'/rest/v1/public_active_verified_vehicles_test?select=*&limit=2000',{headers});
if(!res.ok)throw new Error('Public stock unavailable HTTP '+res.status);
const stock=await res.json();
if(!Array.isArray(stock)||stock.length<1||stock.length>=2000)throw new Error('Stock empty or pagination limit reached; refusing to publish');
function card(v){const t=title(v),price=amount(v.price),img=v.image||String(v.images||'').split(',')[0];return '<article class="vehicle">'+(img?'<img loading="lazy" src="'+esc(img)+'" alt="'+esc(t)+'">':'')+'<div class="body"><h3><a href="details.html?id='+encodeURIComponent(v.id)+'">'+esc(t)+'</a></h3><strong>R'+price.toLocaleString('en-ZA')+'</strong><p>'+esc(v.location||'South Africa')+'</p><a href="details.html?id='+encodeURIComponent(v.id)+'">View vehicle</a></div></article>'}
function render(spec,rows){
 const url=SITE+'/'+spec.file,description='Browse '+spec.label.toLowerCase()+' in South Africa. Compare real prices and mileage from verified CarScoutZA dealers and contact sellers directly.';
 const list=rows.slice(0,18).map((v,i)=>({'@type':'ListItem',position:i+1,name:title(v),url:SITE+'/details.html?id='+encodeURIComponent(v.id)}));
 const json={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage',name:spec.label,url,description},{'@type':'ItemList',name:spec.label,numberOfItems:list.length,itemListElement:list}]};
 const related=specs.filter(x=>x.file!==spec.file).map(x=>'<a href="'+x.file+'">'+esc(x.label)+'</a>').join('');
 const intro='Find '+spec.label.toLowerCase()+' from verified South African dealerships. Compare advertised prices, model years and mileage before contacting the dealer directly. Stock and prices can change as vehicles are sold or added.';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.label)} for Sale in South Africa | CarScoutZA</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify(json)}</script><style>body{font:16px/1.6 Arial,sans-serif;margin:0;background:#f3f6fa;color:#15233d}main{max-width:1120px;margin:auto;padding:24px 16px}.box{background:white;border-radius:14px;padding:25px;margin:0 0 22px}h1{font-size:clamp(26px,4vw,38px);line-height:1.2}a{color:#075acb}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.vehicle{border:1px solid #dbe3ef;border-radius:10px;overflow:hidden}.vehicle img{width:100%;height:180px;object-fit:cover}.body{padding:13px}.body h3{font-size:17px;margin:0 0 8px}.links{display:flex;flex-wrap:wrap;gap:12px}.links a{border:1px solid #ccd8ea;border-radius:7px;padding:9px}.cta{display:inline-block;background:#075acb;color:white;padding:12px 17px;border-radius:8px;text-decoration:none}@media(max-width:700px){.grid{grid-template-columns:1fr}.box{padding:19px}}</style></head><body><main><nav><a href="index.html">CarScoutZA</a> › Budget vehicle searches</nav><section class="box"><h1>${esc(spec.label)} for Sale in South Africa</h1><p>${esc(intro)}</p><a class="cta" href="index.html">Search all current vehicles</a></section><section class="box"><h2>Current vehicles matching your budget</h2><p>Showing ${rows.length} matching listings at the latest daily refresh. All prices shown are advertised prices, not finance estimates.</p><div class="grid">${rows.slice(0,18).map(card).join('')}</div></section><section class="box"><h2>Buying within your budget</h2><p>Ask the dealer to confirm availability, service history, roadworthy requirements, any fees and the full finance quotation. Consider insurance, tyres and maintenance in addition to the advertised price.</p><h2>Explore other budgets</h2><div class="links">${related}<a href="bakkies-for-sale.html">All used bakkies</a><a href="car-buying-guides.html">Car buying guides</a></div></section></main></body></html>`;
}
let generated=0;
const outputs=[];
for(const spec of specs){
 const rows=stock.filter(v=>Number.isFinite(amount(v.price))&&amount(v.price)>0&&amount(v.price)<=spec.max&&kind(v)===spec.kind).sort((a,b)=>amount(a.price)-amount(b.price));
 console.log(spec.file,rows.length);
 if(rows.length<5)throw new Error('Too few vehicles for '+spec.file);
 fs.writeFileSync(spec.file,render(spec,rows));outputs.push(spec.file);generated++;
}
if(generated!==specs.length||outputs.some(f=>!fs.existsSync(f)||!fs.readFileSync(f,'utf8').includes('<h1>')))throw new Error('Budget SEO output validation failed');
console.log('Generated and verified '+generated+' budget pages from '+stock.length+' publicly eligible vehicles.');
