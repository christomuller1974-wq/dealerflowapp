import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),today=new Date().toISOString().slice(0,10);
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!/^(admin|dealer-admin|seo-generator|dealer-seo-generator)/.test(f)).sort();
const old=fs.existsSync('sitemap.xml')?fs.readFileSync('sitemap.xml','utf8'):'';
const previous=new Map([...old.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/g)].map(m=>[m[1],m[2]]));
let changed=new Set();
try{changed=new Set(execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));}catch{}
const priority=f=>f==='index.html'?'1.0':/^(used-cars-near-me|bakkies-for-sale|used-[^-].*-for-sale|car-buying-guides)/.test(f)?'0.9':'0.8';
const entries=files.map(f=>{const url=`https://carscoutza.com/${f==='index.html'?'':f}`,lastmod=changed.has(f)||!previous.has(url)?today:previous.get(url);return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${/details|dealer/.test(f)?'daily':'weekly'}</changefreq>\n    <priority>${priority(f)}</priority>\n  </url>`;});
fs.writeFileSync('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
console.log(`Wrote ${entries.length} unique sitemap URLs.`);
