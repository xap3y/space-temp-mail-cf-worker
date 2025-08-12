import PostalMime from "postal-mime";

function toBase64(uint8) {
  let result = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    result += String.fromCharCode.apply(null, chunk);
  }
  return btoa(result);
}

export default {
  async email(message, env, ctx) {
    try {

      await message.forward("xap3ytemp@gmail.com");

      const raw = await new Response(message.raw).arrayBuffer();
      const parsed = await new PostalMime().parse(raw);

      const payload = {
        envelope: {
          from: message.from,
          to: message.to,
          helo: message.helo,
          mailFrom: message.mailFrom,
          rcptTo: message.rcptTo
        },
        headers: Object.fromEntries(parsed.headers || []),
        subject: parsed.subject || "",
        from: parsed.from?.text || message.from,
        to: parsed.to?.text || message.to,
        cc: parsed.cc?.text || "",
        date: parsed.date || "",
        messageId: parsed.messageId || "",
        text: parsed.text || "",
        html: parsed.html || "",
        attachments: (parsed.attachments || []).map(a => ({
          filename: a.filename || "",
          contentType: a.mimeType || "application/octet-stream",
          size: a.size || 0,
          contentBase64: a.content ? toBase64(new Uint8Array(a.content)) : ""
        }))
      };
      console.log("SENDING TO " + env.INBOUND_POST_URL)
      console.log("WITH " + env.INBOUND_TOKEN)
      const res = await fetch(env.INBOUND_POST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Email-Token": env.INBOUND_TOKEN,
          "User-Agent": "CF-Worker/1.0 (https://xap3y.fun"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn("Inbound POST failed:", res.status, await res.text());
      }
      console.log("Inbound POST succeeded:", res.status);
      const text = await res.text();
      const text2 = JSON.stringify(res)
      console.log("Response text:", text);
      console.log("Response text2:", text2);
    } catch (err) {
      console.error("Email handler error:", err);
    }
  },

  async fetch(req, env, ctx) {
    return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
  }
};