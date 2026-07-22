/**
 * 익명 계정 토큰 — HMAC-SHA256 서명.
 *
 * 저장하는 것: uid, 발급시각. 그 외 개인정보는 담지 않는다.
 * 토큰은 "위조 방지"일 뿐 "사람임의 증명"이 아니다 — Sybil 완화는
 * rate limit + provisional 순위로 별도 처리한다.
 */

const enc = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TokenPayload {
  uid: string;
  iat: number;
}

export async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180; // 180일

export async function verifyToken(secret: string, token: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  let ok = false;
  try {
    const key = await hmacKey(secret);
    ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), enc.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as TokenPayload;
    if (!payload?.uid || typeof payload.iat !== 'number') return null;
    if (Date.now() - payload.iat > TOKEN_MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

/** deviceId 원문은 저장하지 않고 HMAC만 보관한다. */
export function hashDevice(secret: string, deviceId: string): Promise<string> {
  return hmacHex(secret, `device:${deviceId}`);
}

export function hashTransferCode(secret: string, code: string): Promise<string> {
  return hmacHex(secret, `transfer:${code.toUpperCase()}`);
}
