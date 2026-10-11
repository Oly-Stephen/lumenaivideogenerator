import { fetchRetry } from "../net.ts";

// Fish Audio TTS (docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech).
// Free developer model `s2.1-pro-free` during testing (D007); responses are MP3 bytes.

export interface FishTtsInput {
  text: string;
  referenceId: string;
  speed?: number;
}

export async function fishTts(apiKey: string, model: string, input: FishTtsInput): Promise<Buffer> {
  if (!apiKey) throw new Error("FISH_API_KEY missing");
  const res = await fetchRetry("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model },
    body: JSON.stringify({
      text: input.text,
      reference_id: input.referenceId,
      format: "mp3",
      mp3_bitrate: 128,
      sample_rate: 44100,
      normalize: true,
      latency: "normal",
      prosody: { speed: input.speed ?? 1, normalize_loudness: true },
    }),
  }, { retryOnStatus: true, label: "Fish TTS" }); // TTS is stateless: re-requesting is safe
  if (!res.ok) throw new Error(`Fish TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 1000) throw new Error(`Fish TTS returned only ${buf.byteLength} bytes`);
  return buf;
}
