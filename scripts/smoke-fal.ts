// M0 acceptance: fal accepts an R2 presigned URL as model input.
// Cost: one google/nano-banana-2.1/edit call at 1K ≈ $0.044. Refuses to run without --confirm.
//   npm run smoke:fal -- --confirm
import { deflateSync } from "node:zlib";
import { presign, r2ConfigFromEnv } from "../supabase/functions/_shared/r2.ts";

const ENDPOINT = process.env.IMAGE_ENDPOINT ?? "google/nano-banana-2.1/edit";
const EST_USD = 0.044;

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/** 256×256 two-colour test card (no external assets). */
function testPng(): Uint8Array<ArrayBuffer> {
  const w = 256, h = 256;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const on = (x >> 5) % 2 === (y >> 5) % 2;
      raw[o] = on ? 0x2a : 0xf2; raw[o + 1] = on ? 0x9d : 0xe8; raw[o + 2] = on ? 0x8f : 0xcf;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]));
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.log(`This makes ONE live fal call to ${ENDPOINT} (≈ $${EST_USD}). Re-run with --confirm.`);
    process.exit(1);
  }
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY missing");
  const r2 = r2ConfigFromEnv((k) => process.env[k]);

  const key = "u/00000000-0000-0000-0000-000000000000/smoke/test-card.png";
  const put = await presign(r2, key, "PUT", 600, "image/png");
  const up = await fetch(put, { method: "PUT", headers: { "content-type": "image/png" }, body: testPng() });
  if (!up.ok) throw new Error(`R2 upload failed: ${up.status} ${await up.text()}`);
  const imageUrl = await presign(r2, key, "GET", 3600);
  console.log("uploaded test card to R2; presigned GET ok:", (await fetch(imageUrl)).status);

  const auth = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  const sub = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      prompt: "Redraw this test card as a flat 2D vector illustration of a teal and cream checkerboard tabletop, top-down view.",
      image_urls: [imageUrl],
      resolution: "1K",
      aspect_ratio: "1:1",
      num_images: 1,
    }),
  });
  if (!sub.ok) throw new Error(`fal submit failed: ${sub.status} ${await sub.text()}`);
  const { request_id, status_url, response_url } = (await sub.json()) as Record<string, string>;
  console.log("fal request", request_id);

  let delay = 2000;
  for (;;) {
    const st = (await (await fetch(status_url!, { headers: auth })).json()) as { status: string; error?: string };
    if (st.status === "COMPLETED") {
      if (st.error) throw new Error(`fal error: ${st.error}`);
      break;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 10_000);
  }
  const result = (await (await fetch(response_url!, { headers: auth })).json()) as { images?: { url: string }[] };
  console.log("OK — fal read the R2 presigned URL. Output:", result.images?.[0]?.url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
