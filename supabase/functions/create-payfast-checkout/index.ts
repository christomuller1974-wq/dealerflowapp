import { createClient } from "npm:@supabase/supabase-js@2";
import { json, signature } from "../_shared/payfast.ts";

const siteUrl=(Deno.env.get("SITE_URL")||"https://carscoutza.com").replace(/\/$/,"");
const cors={"access-control-allow-origin":siteUrl,"access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS"};

Deno.serve(async request=>{
  if(request.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(request.method!=="POST") return json({error:"Method not allowed"},405,cors);
  try{
    const authorization=request.headers.get("authorization")||"";
    const supabaseUrl=Deno.env.get("SUPABASE_URL")!,anonKey=Deno.env.get("SUPABASE_ANON_KEY")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const merchantId=Deno.env.get("PAYFAST_MERCHANT_ID"),merchantKey=Deno.env.get("PAYFAST_MERCHANT_KEY"),passphrase=Deno.env.get("PAYFAST_PASSPHRASE");
    if(!merchantId||!merchantKey||!passphrase) return json({error:"Secure checkout is not configured."},503,cors);
    const authClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authorization}}});
    const {data:{user},error:userError}=await authClient.auth.getUser();
    if(userError||!user) return json({error:"Please sign in again."},401,cors);
    const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:profile,error:profileError}=await service.from("profiles").select("dealer_name,approval_status,dealer_verified,admin_blocked,admin_free_until,paid_until").eq("id",user.id).single();
    if(profileError||!profile) return json({error:"Dealer profile not found."},404,cors);
    if(profile.approval_status!=="ACTIVE"||profile.dealer_verified!==true||profile.admin_blocked===true) return json({error:"This dealership is not eligible to renew. Please contact CarScoutZA Admin."},403,cors);
    const now=Date.now(),freeActive=profile.admin_free_until&&new Date(profile.admin_free_until).getTime()>now,paidActive=profile.paid_until&&new Date(profile.paid_until).getTime()>now;
    if(freeActive&&!paidActive) return json({error:`Your free access remains active until ${new Date(profile.admin_free_until).toLocaleDateString("en-ZA")}. No payment is due yet.`},409,cors);

    const internalReference=`order_${crypto.randomUUID()}`,paymentId=`CSZ-${crypto.randomUUID()}`;
    const {error:insertError}=await service.from("subscription_payments").insert({dealer_id:user.id,internal_reference:internalReference,m_payment_id:paymentId,amount:2000,currency:"ZAR",status:"PENDING"});
    if(insertError) throw insertError;
    const supabaseProjectUrl=supabaseUrl.replace(/\/$/,"");
    const fields:Record<string,string>={
      merchant_id:merchantId,merchant_key:merchantKey,
      return_url:`${siteUrl}/payment-success.html?payment=${encodeURIComponent(internalReference)}`,
      cancel_url:`${siteUrl}/payment.html?cancelled=1&payment=${encodeURIComponent(internalReference)}`,
      notify_url:`${supabaseProjectUrl}/functions/v1/payfast-itn`,
      name_first:String(profile.dealer_name||"CarScoutZA Dealer").slice(0,100),
      email_address:String(user.email||"").slice(0,100),m_payment_id:paymentId,amount:"2000.00",item_name:"CarScoutZA Dealer Membership - 30 Days"
    };
    fields.signature=signature(Object.entries(fields),passphrase);
    const sandbox=(Deno.env.get("PAYFAST_MODE")||"sandbox").toLowerCase()!=="live";
    return json({action_url:sandbox?"https://sandbox.payfast.co.za/eng/process":"https://www.payfast.co.za/eng/process",fields,internal_reference:internalReference},200,cors);
  }catch(error){console.error("Checkout creation failed",error instanceof Error?error.message:"Unknown error");return json({error:"Secure checkout could not be created. No payment has been taken."},500,cors)}
});
