import fs from 'node:fs';
const SITE='https://carscoutza.com',SUPA='https://ddmvzypiccryjndcwlre.supabase.co',KEY='sb_publishable_D7saHOTE_JhSlMnSgBnIhQ_mOAOUD9s';
const specs=[
 {file:'used-vw-polo-vivo-for-sale.html',label:'Used Volkswagen Polo Vivo',match:t=>/\bpolo\s*vivo\b/i.test(t),parent:'used-vw-polo-for-sale.html'},
 {file:'used-toyota-hilux-double-cab-for-sale.html',label:'Used Toyota Hilux Double Cab',match:t=>/\bhilux\b/i.test(t)&&/(double\s*cab|dbl\s*cab|dubbelcab|d\/cab|d\/c\b|p\/u\s*d\/c\b|\bdc\b)/i.test(t),parent:'used-toyota-hilux-for-sale.html'},
 {file:'used-ford-ranger-supercab-for-sale.html',label:'Used Ford Ranger SuperCab',match:t=>/\branger\b/i.test(t)&&/(super\s*cab|supercab|extended\s*cab|extra\s*cab|e\/cab|e\/c\b|p\/u\s*s\/c\b|s\/cab|s\/c\b)/i.test(t),parent:'used-ford-ranger-for-sale.html'}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=v=>[v.year,v.make,v.model,v.variant].filter(Boolean).join(' ')||v.title||'Used vehicle';
const image=v=>v.image||(Array.isArray(v.images)?v.images[0]:String(v.images||'').split(',')[0]);
const price=v=>{const n=Number(String(v??'').replace(/[^0-9]/g,''));return n>0?'R'+n.toLocaleString('en-ZA'):'Price on request'};
const response=await fetch(SUPA+'/rest/v1/public_active_verified_vehicles_test?select=*&limit=2000',{headers:{apikey:KEY,Authorization:'Bearer '+KEY}});
if(!response.ok)throw Error('Public stock fetch failed: '+response.status);
const vehicles=await response.json();
if(!Array.isArray(vehicles)||vehicles.length<1||vehicles.length>=2000)throw Error('Stock unavailable or truncated');
for(const spec of specs){
 const matches=vehicles.filter(v=>spec.match([v.make,v.model,v.variant,v.title].filter(Boolean).join(' ')));
 if(matches.length<5)throw Error('Insufficient relevant stock for '+spec.label+': '+matches.length);
 const url=SITE+'/'+spec.file;
 const description='Compare '+spec.label.toLowerCase()+' for sale from verified South African dealers. View current advertised prices and contact the dealership directly.';
 const cards=matches.slice(0,18).map(v=>'<article class="vehicle">'+(image(v)?'<img loading="lazy" src="'+esc(image(v))+'" alt="'+esc(title(v))+'">':'')+'<div class="body"><h3><a href="details.html?id='+encodeURIComponent(v.id)+'">'+esc(title(v))+'</a></h3><strong>'+price(v.price)+'</strong><p>'+esc(v.location||'South Africa')+'</p><a href="details.html?id='+encodeURIComponent(v.id)+'">View vehicle</a></div></article>').join('');
 const list=matches.slice(0,18).map((v,i)=>({'@type':'ListItem',position:i+1,name:title(v),url:SITE+'/details.html?id='+encodeURIComponent(v.id)}));
 const schema={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage',name:spec.label+' for Sale in South Africa',url,description},{'@type':'ItemList',numberOfItems:list.length,itemListElement:list}]};
 const related=specs.filter(x=>x.file!==spec.file).map(x=>'<a href="'+x.file+'">'+esc(x.label)+'</a>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(spec.label)+' for Sale in South Africa | CarScoutZA</title><meta name="description" content="'+esc(description)+'"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+url+'"><script type="application/ld+json">'+JSON.stringify(schema)+'</script><style>body{margin:0;background:#f4f7fb;color:#172033;font:16px/1.6 Arial,sans-serif}main{max-width:1120px;margin:auto;padding:22px}.box{background:white;padding:26px;border-radius:14px;margin:0 0 22px}h1{font-size:clamp(27px,4vw,38px)}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.vehicle{border:1px solid #dce4ef;border-radius:10px;overflow:hidden}.vehicle img{width:100%;height:185px;object-fit:cover}.body{padding:14px}.body h3{font-size:17px}.links{display:flex;flex-wrap:wrap;gap:14px}a{color:#075acb}@media(max-width:700px){.grid{grid-template-columns:1fr}.box{padding:19px}}</style></head><body><main><nav><a href="index.html">CarScoutZA</a> › <a href="'+spec.parent+'">Used vehicle models</a></nav><section class="box"><h1>'+esc(spec.label)+' for Sale in South Africa</h1><p>'+esc(description)+'</p><p>Compare advertised prices, model years and specifications. Confirm service history, condition, finance terms and availability directly with the advertising dealer.</p></section><section class="box"><h2>Current verified dealer listings</h2><p>'+matches.length+' matching vehicles at the latest stock refresh. Showing up to 18 listings.</p><div class="grid">'+cards+'</div></section><section class="box"><h2>Compare related vehicles</h2><div class="links"><a href="'+spec.parent+'">All related models</a>'+related+'<a href="bakkies-for-sale.html">Used bakkies</a></div></section></main></body></html>';
 fs.writeFileSync(spec.file,html);
 if(!html.includes('<h1>')||!html.includes('rel="canonical"'))throw Error('Page validation failed '+spec.file);
 console.log(spec.file+': '+matches.length+' public vehicles');
}
console.log('Generated all three vehicle-specific SEO pages.');
