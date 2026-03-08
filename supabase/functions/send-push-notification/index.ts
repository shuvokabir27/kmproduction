import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidAuthHeader(
  audience: string,
  subject: string,
  privateKeyJwk: JsonWebKey
): Promise<{ authorization: string; cryptoKey: string }> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw format (r || s)
  const sigArray = new Uint8Array(signature);
  const signatureB64 = uint8ArrayToBase64Url(sigArray);
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Get public key from private JWK
  const pubJwk = { ...privateKeyJwk, d: undefined, key_ops: ["verify"] };
  const pubKey = await crypto.subtle.importKey(
    "jwk",
    pubJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const pubKeyRaw = await crypto.subtle.exportKey("raw", pubKey);
  const pubKeyB64 = uint8ArrayToBase64Url(new Uint8Array(pubKeyRaw));

  return {
    authorization: `vapid t=${jwt}, k=${pubKeyB64}`,
    cryptoKey: pubKeyB64,
  };
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPubKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToUint8Array(p256dhKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPubKey },
    localKeyPair.privateKey,
    256
  );

  const authSecretBytes = base64UrlToUint8Array(authSecret);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive keys
  const sharedSecretKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // PRK = HKDF-Extract(auth_secret, shared_secret)
  const authInfo = encoder.encode("Content-Encoding: auth\0");
  const prkKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Simplified: use HKDF with auth as salt
  const ikm = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const subscriberPubKeyRaw = base64UrlToUint8Array(p256dhKey);

  // Create context for key derivation
  const context = new Uint8Array([
    ...encoder.encode("P-256\0"),
    0, 65, ...subscriberPubKeyRaw,
    0, 65, ...localPublicKey,
  ]);

  // Derive content encryption key using HKDF
  const prk = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: authSecretBytes,
      info: encoder.encode("Content-Encoding: auth\0"),
    },
    ikm,
    256
  );

  const prkImported = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const cekInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: aesgcm\0"),
    ...context,
  ]);

  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    prkImported,
    128
  );

  const nonceInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: nonce\0"),
    ...context,
  ]);

  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prkImported,
    96
  );

  // Encrypt with AES-GCM
  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Add padding
  const paddedPayload = new Uint8Array([0, 0, ...encoder.encode(payload)]);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBits },
    cek,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, sender_id, content } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get VAPID keys
    const { data: vapidData } = await supabase
      .from("vapid_keys")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!vapidData) {
      return new Response(JSON.stringify({ error: "No VAPID keys configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const privateKeyJwk = JSON.parse(vapidData.private_key);

    // Get sender name
    const { data: sender } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", sender_id)
      .maybeSingle();

    // Get conversation members (excluding sender)
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .neq("user_id", sender_id);

    if (!members?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberIds = members.map((m: any) => m.user_id);

    // Get push subscriptions for those members
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", memberIds);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payloadStr = JSON.stringify({
      title: sender?.full_name || "নতুন মেসেজ",
      body: content?.substring(0, 100) || "",
      url: "/chat",
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

        const { authorization } = await createVapidAuthHeader(
          audience,
          "mailto:admin@kmproduction.com",
          privateKeyJwk
        );

        const { encrypted, salt, localPublicKey } = await encryptPayload(
          payloadStr,
          sub.p256dh,
          sub.auth
        );

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: authorization,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aesgcm",
            Encryption: `salt=${uint8ArrayToBase64Url(salt)}`,
            "Crypto-Key": `dh=${uint8ArrayToBase64Url(localPublicKey)}`,
            TTL: "86400",
            Urgency: "high",
          },
          body: encrypted,
        });

        if (response.ok || response.status === 201) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      } catch (err) {
        console.error("Push send error for subscription:", sub.id, err);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
