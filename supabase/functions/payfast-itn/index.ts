import { createClient } from "npm:@supabase/supabase-js@2";
import { json, parameterString, safeEqual, signature } from "../_shared/payfast.ts";

Deno.serve(async request=>{
  if(request.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const passphrase=Deno.env.get("PAYFAST_PASSPHRASE"),merchantId=Deno.env.get("PAYFAST_MERCHANT_ID"),validIps=(Deno.env.get("PAYFAST_VALID_IPS")||"").split(",").map(v=>v.trim()).filter(Boolean);
    if(!passphrase||!merchantId||!validIps.length) return json({error:"ITN verification is not configured"},503);
    const sourceIp=(request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"").split(",")[0].trim();
    if(!validIps.includes(sourceIp)) return json({error:"Untrusted notification source"},403);
    const form=await request.formData(),entries:Array<[string,string]>=[];
    form.forEach((value,key)=>entries.push([key,String(value)]));
    const values=Object.fromEntries(entries),receivedSignature=values.signature||"";
    if(!receivedSignature||!safeEqual(signature(entries,passphrase),receivedSignature)) return json({error:"Invalid signature"},400);
    if(values.merchant_id!==merchantId||values.payment_status!=="COMPLETE") return json({error:"Payment is not complete or merchant is invalid"},400);
    const amount=Number(values.amount_gross);
    if(!Number.isFinite(amount)||amount!==2000) return json({error:"Amount mismatch"},400);

    const supabaseUrl=Deno.env.get("SUPABASE_URL")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:payment,error:paymentError}=await service.from("subscription_payments").select("id,dealer_id,m_payment_id,amount,currency,status,pf_payment_id").eq("m_payment_id",values.m_payment_id).single();
    if(paymentError||!payment||Number(payment.amount)!==2000||payment.currency!=="ZAR") return json({error:"Unknown or mismatched payment"},400);
    if(payment.status==="COMPLETE") return new Response("OK",{status:200});
    if(payment.status!=="PENDING"||!values.pf_payment_id) return json({error:"Payment cannot be processed"},409);

    const sandbox=(Deno.env.get("PAYFAST_MODE")||"sandbox").toLowerCase()!=="live";
    const validateUrl=sandbox?"https://sandbox.payfast.co.za/eng/query/validate":"https://www.payfast.co.za/eng/query/validate";
    const validationBody=parameterString(entries);
    const validationResponse=await fetch(validateUrl,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:validationBody});
    const validationText=(await validationResponse.text()).trim();
    if(!validationResponse.ok||validationText!=="VALID") return json({error:"PayFast server validation failed"},400);

    const verifiedAt=new Date().toISOString();
    const {data:result,error:finalizeError}=await service.rpc("finalize_subscription_payment",{p_m_payment_id:values.m_payment_id,p_pf_payment_id:values.pf_payment_id,p_verified_at:verifiedAt});
    if(finalizeError) throw finalizeError;
    console.log("Verified PayFast payment",{payment_id:payment.id,already_processed:Boolean(result?.already_processed)});
    return new Response("OK",{status:200});
  }catch(error){console.error("ITN verification failed",error instanceof Error?error.message:"Unknown error");return json({error:"Notification not processed"},500)}
});
