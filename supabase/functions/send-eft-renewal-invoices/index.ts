import {createClient} from "npm:@supabase/supabase-js@2";
const TZ="Africa/Johannesburg";
const from="CarScoutZA Renewals <renewals@carscoutza.com>";
const date=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const plus=(d:string,n:number)=>{const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const last=(d:string)=>{const [y,m]=d.split("-").map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c));
const respond=(o:unknown,status=200)=>new Response(JSON.stringify(o),{status,headers:{"content-type":"application/json"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,api=Deno.env.get("RESEND_API_KEY");
 if(!url||!key||!api)return respond({error:"Configuration missing"},503);
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data:ok}=await db.rpc("verify_expiry_reminder_cron_secret",{p_secret:req.headers.get("x-cron-secret")||""});
 if(ok!==true)return respond({error:"Unauthorized"},401);
 let dry=false;try{dry=(await req.json()).dry_run===true}catch{}
 const today=date(new Date()),due3=plus(today,3),due1=plus(today,1);
 const {data:profiles,error:pe}=await db.from("profiles").select("id,dealer_name,paid_until,approval_status,dealer_verified,admin_blocked").eq("approval_status","ACTIVE").eq("dealer_verified",true);
 if(pe)return respond({error:"Profiles unavailable"},500);
 const {data:eft,error:ee}=await db.from("dealer_scheduled_eft").select("*");
 const {data:invoices,error:ie}=await db.from("invoice_renewal_requests").select("dealer_id,status,accounts_email,registered_name,created_at").order("created_at",{ascending:false});
 const {data:codes,error:ce}=await db.from("dealer_account_codes").select("dealer_id,account_number");
 if(ee||ie||ce)return respond({error:"Billing records unavailable"},500);
 const eftMap=new Map((eft||[]).map(x=>[x.dealer_id,x]));
 const codeMap=new Map((codes||[]).map(x=>[x.dealer_id,x.account_number]));
 const invoiceMap=new Map();for(const x of invoices||[])if(!invoiceMap.has(x.dealer_id))invoiceMap.set(x.dealer_id,x);
 const candidates=[];
 for(const p of profiles||[]){
  if(p.admin_blocked)continue;
  const e=eftMap.get(p.id),i=invoiceMap.get(p.id);
  let kind="",expiry="",periodStart="",periodEnd="",ref="";
  if(e&&e.status==="ACTIVE"){
   kind="SCHEDULED_EFT";expiry=last(today);
   if(today!==plus(expiry,-3)&&today!==plus(expiry,-1))continue;
   periodStart=plus(expiry,1);periodEnd=last(periodStart);ref=e.payment_reference;
  }else if(i&&i.status==="ACTIVATED"&&p.paid_until){
   kind="INVOICE_EFT";expiry=date(new Date(p.paid_until));
   if(today!==plus(expiry,-3)&&today!==plus(expiry,-1))continue;
   periodStart=expiry;periodEnd=plus(expiry,30);
   ref="CSZ-"+String(codeMap.get(p.id)||"").padStart(4,"0");
  }else continue;
  const phase=today===plus(expiry,-3)?"invitation":"reminder";
  candidates.push({p,e,i,kind,expiry,periodStart,periodEnd,ref,phase});
 }
 if(dry)return respond({dry_run:true,date:today,eligible:candidates.length,scheduled:candidates.filter(x=>x.kind==="SCHEDULED_EFT").length,invoice_eft:candidates.filter(x=>x.kind==="INVOICE_EFT").length});
 const result={date:today,eligible:candidates.length,sent:0,skipped:0,failed:0};
 for(const c of candidates){
  const account=String(codeMap.get(c.p.id)||"").padStart(4,"0");
  const invoiceNo="CSZ-"+c.periodStart.replaceAll("-","")+"-"+account;
  const {data:existing}=await db.from("dealer_renewal_notices").select("*").eq("dealer_id",c.p.id).eq("period_start",c.periodStart).eq("kind",c.kind).maybeSingle();
  let notice=existing;
  if(!notice){
   const {data:created,error:insertErr}=await db.from("dealer_renewal_notices").insert({dealer_id:c.p.id,period_start:c.periodStart,period_end:c.periodEnd,due_date:c.expiry,invoice_number:invoiceNo,payment_reference:c.ref,kind:c.kind}).select("*").single();
   if(insertErr){result.failed++;continue}notice=created;
  }
  const field=c.phase==="invitation"?"invitation_sent_at":"reminder_sent_at";
  if(notice[field]){result.skipped++;continue}
  if(c.phase==="reminder"&&!notice.invitation_sent_at){result.skipped++;continue}
  const {data:user}=await db.auth.admin.getUserById(c.p.id);
  const email=c.i?.accounts_email||user?.user?.email||"";
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){result.failed++;continue}
  const name=String(c.p.dealer_name||c.i?.registered_name||"Dealer");
  const intro=c.phase==="invitation"?"Thank you for being part of the CarScoutZA family! We're excited to keep growing with you. Your renewal invoice is ready for the upcoming billing period.":"Just a friendly reminder that your CarScoutZA membership is due for renewal tomorrow. We'd love to keep showcasing your vehicles to buyers across South Africa.";
  const thanks=c.phase==="invitation"?"Please arrange payment before your renewal date to keep your dealership's exposure uninterrupted.":"If you've already arranged payment, thank you! There's no need to upload proof; we'll verify the deposit against our FNB statement.";
  const subject=c.phase==="invitation"?"Your CarScoutZA renewal invitation and invoice":"A friendly CarScoutZA renewal reminder";
  const body=`Dear ${name},\n\n${intro}\n\nInvoice: ${invoiceNo}\nBilling period: ${c.periodStart} to ${c.periodEnd}\nAmount: R2,000.00\nPayment due: ${c.expiry}\nBank: FNB\nAccount holder: C & S Muller Family Trust\nAccount number: 62150459090\nBranch code: 231002\nPayment reference: ${c.ref}\n\n${thanks}\n\nThank you for being a valued member of the CarScoutZA family.\n\nWarm regards,\nThe CarScoutZA Team\ncarscoutza@gmail.com\nhttps://carscoutza.com`;
  const html=`<html><body style="font-family:Arial,sans-serif;color:#1e293b;background:#f1f5f9;padding:24px"><div style="max-width:640px;margin:auto;background:white;padding:30px;border-radius:12px"><h2 style="color:#1d4ed8">CarScoutZA</h2><p>Dear ${esc(name)},</p><p>${esc(intro)}</p><div style="background:#f8fafc;padding:16px;border-radius:8px"><strong>Renewal invoice ${esc(invoiceNo)}</strong><p>Billing period: ${esc(c.periodStart)} to ${esc(c.periodEnd)}<br>Amount: <b>R2,000.00</b><br>Payment due: ${esc(c.expiry)}</p><p>FNB | C &amp; S Muller Family Trust<br>Account: 62150459090 | Branch: 231002<br>Reference: <b>${esc(c.ref)}</b></p></div><p>${esc(thanks)}</p><p>Thank you for being part of the CarScoutZA family!</p><p>Warm regards,<br>The CarScoutZA Team<br>carscoutza@gmail.com<br>www.carscoutza.com</p></div></body></html>`;
  try{
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:"Bearer "+api,"content-type":"application/json"},body:JSON.stringify({from,to:[email],reply_to:"carscoutza@gmail.com",subject,text:body,html})});
   const output=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error("Email provider "+response.status);
   await db.from("dealer_renewal_notices").update({[field]:new Date().toISOString(),[c.phase==="invitation"?"invitation_provider_id":"reminder_provider_id"]:output.id||null}).eq("id",notice.id);
   result.sent++;
  }catch(err){console.error("Renewal email failed",c.p.id,String(err));result.failed++}
 }
 return respond(result);
});