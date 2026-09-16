import { md5, payfastEncode as payFastEncode } from "../_shared/payfast.ts";

export function parameterString(
  entries: Iterable<[string, string]>,
  includePassphrase?: string,
): string {
  const parts: string[] = [];

  for (const [key, value] of entries) {
    if (key === "signature") {
      break;
    }

    parts.push(`${key}=${payFastEncode(value)}`);
  }

  if (includePassphrase) {
    parts.push(`passphrase=${payFastEncode(includePassphrase)}`);
  }

  return parts.join("&");
}

export function signature(
  entries: Iterable<[string, string]>,
  passphrase: string,
): string {
  return md5(parameterString(entries, passphrase));
}
