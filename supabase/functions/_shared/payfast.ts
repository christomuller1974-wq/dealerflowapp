import { createHash, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export function payfastEncode(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+").replace(/[!'()~]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function parameterString(entries: Iterable<[string,string]>, includePassphrase?: string): string {
  const parts: string[] = [];
  for (const [key,value] of entries) if (key !== "signature" && value !== "") parts.push(`${key}=${payfastEncode(value)}`);
  if (includePassphrase) parts.push(`passphrase=${payfastEncode(includePassphrase)}`);
  return parts.join("&");
}

export function md5(value: string): string { return createHash("md5").update(value).digest("hex"); }
export function signature(entries: Iterable<[string,string]>, passphrase: string): string { return md5(parameterString(entries,passphrase)); }
export function safeEqual(a: string,b: string): boolean { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
export function json(body: unknown,status=200,headers: HeadersInit={}): Response { return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8",...headers}}); }
