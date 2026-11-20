import fs from 'node:fs';
const SUPA='https://ddmvzypiccryjndcwlre.supabase.co';
const KEY='sb_publishable_D7saHOTE_JhSlMnSgBnIhQ_mOAOUD9s';
const towns=['Bloemfontein','Kimberley','Klerksdorp','Pretoria','Kuruman','Upington','Welkom','Potchefstroom'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').trim().toLowerCase().replace(/\\s+/g,' ');
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-');
const money=v=>{const n=Number(String(v??'').replace(/[^0-9]/g,''));return n>0?'R'+n.toLocaleString('en-ZA'):'Price on request'};
const image=v=>v.image||(Array.isArray(v.images)?v.images[0]:String(v.images||'').split(',')[0]);
const title=v=>[v.year,v.make,v.model,v.variant].filter(Boolean).join(' ')||v.title||'Used vehicle';
async function get(path){const r=await fetch(SUPA+'/rest/v1/'+path,{headers:{apikey:KEY,Authorization:'Bearer '+KEY}});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()}
const [dealers,stock]=await Promise.all([get('public_active_verified_dealers?select=id,town,province,dealer_name&limit=1000'),get('public_active_verified_vehicles_test?select=*&limit=2000')]);
if(stock.length<1||stock.length>=2000)throw Error('Unexpected stock count; stop town SEO refresh');
const byId=new Map(dealers.filter(d=>d.id&&d.town).map(d=>[String(d.id),d]));
const begin='<!-- CARSCOUTZA_TOWN_STOCK_START -->',end='<!-- CARSCOUTZA_TOWN_STOCK_END -->';
let count=0;
for(const town of towns){
 const file='used-cars-for-sale-'+slug(town)+'.html';
 if(!fs.existsSync(file))throw Error('Existing town page missing: '+file);
 const html=fs.readFileSync(file,'utf8');
 const rows=stock.filter(v=>norm(byId.get(String(v.user_id))?.town)===norm(town)).sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
 if(rows.length<5)throw Error('Too few public town listings: '+town);
 const cards=rows.slice(0,18).map(v=>'<article style="border:1px solid #dce4ef;border-radius:10px;overflow:hidden;background:white">'+(image(v)?'<img loading="lazy" style="width:100%;height:170px;object-fit:cover" src="'+esc(image(v))+'" alt="'+esc(title(v))+'">':'')+'<div style="padding:12px"><h3 style="font-size:17px"><a href="details.html?id='+encodeURIComponent(v.id)+'">'+esc(title(v))+'</a></h3><strong>'+money(v.price)+'</strong><p>'+esc(town)+'</p><a href="details.html?id='+encodeURIComponent(v.id)+'">View vehicle</a></div></article>').join('');
 const snapshot=begin+'<section class="info-box" data-town-seo-snapshot="true"><h2>Current verified dealer stock in '+esc(town)+'</h2><p>'+rows.length+' vehicles listed by verified CarScoutZA dealers in '+esc(town)+' at the latest stock refresh. Confirm availability and price with the dealer.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px">'+cards+'</div></section>'+end;
 let output;
 if(html.includes(begin)&&html.includes(end)){const a=html.indexOf(begin),b=html.indexOf(end,a)+end.length;output=html.slice(0,a)+snapshot+html.slice(b)}
 else {const anchor='<section class="info-box">';const idx=html.indexOf(anchor);if(idx<0)throw Error('Town page layout changed: '+file);output=html.slice(0,idx)+snapshot+'\n'+html.slice(idx)}
 if(!output.includes('rel="canonical"')&&!output.includes('rel="canonical"\n'))throw Error('Canonical missing: '+file);
 if(!output.includes('data-town-seo-snapshot'))throw Error('Snapshot missing: '+file);
 fs.writeFileSync(file,output);count++;console.log(town+': '+rows.length+' eligible listings');
}
if(count!==towns.length)throw Error('Town output count mismatch');
console.log('Updated '+count+' existing town pages without creating duplicate URLs');
