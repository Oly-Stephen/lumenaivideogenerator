// Grant credits to a user (service role / admin only). Idempotent per --key.
//   node --env-file=.env --import tsx scripts/grant-credits.ts --email you@example.com --credits 600 --key grant:test:initial
import pg from "pg";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg("email");
const userId = arg("user");
const credits = Number(arg("credits"));
const note = arg("note") ?? "admin grant";
const key = arg("key");
if ((!email && !userId) || !Number.isInteger(credits) || credits <= 0 || !key) {
  console.error("usage: grant-credits --email <email> | --user <uuid>  --credits <int>  --key <idempotency-key> [--note text]");
  process.exit(1);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL!.replace(/\s+#.*$/, "").trim() });
await db.connect();
try {
  const { rows } = await db.query<{ id: string }>(
    userId ? "select id from auth.users where id = $1" : "select id from auth.users where lower(email) = lower($1)", [userId ?? email]);
  if (!rows[0]) throw new Error("user not found");
  await db.query("select public.admin_grant($1, $2, $3, $4)", [rows[0].id, credits, note, key]);
  const bal = await db.query<{ balance: number }>("select coalesce(sum(delta),0)::int as balance from public.credits_ledger where user_id = $1", [rows[0].id]);
  console.log(`granted ${credits} credits (key ${key}); balance now ${bal.rows[0]!.balance}`);
} finally {
  await db.end();
}
