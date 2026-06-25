# Sovereign Licence Mint

Our own way to intake cash and process it — **no Stripe, no Lemon Squeezy, no
Ko-fi, no payment processor in the path.** The mint accepts Bitcoin (on-chain,
and Lightning-ready) straight to an address *you* control, confirms it against a
keyless public block explorer, and signs the Exporter's own Pro licence — the
exact ECDSA-P256 token the userscript already verifies offline.

```
buyer ──pays sats──▶ your Bitcoin address
                          │  (you hold the keys; the mint never touches funds)
buyer ──GET /order──▶ mint ──reads chain──▶ mempool.space  (read-only, no API key)
                          │
                          └─signs licence with the mint's private key─▶ buyer
buyer pastes licence ─▶ Exporter verifies it offline against the public key
```

Why this shape: receiving money to a self-custodied wallet is the only rail a
private party can run end-to-end with **no account, no KYC, no middleman**. The
licence core was already self-sovereign (offline signed keys); this supplies the
missing half — minting them on confirmed payment instead of renting Lemon Squeezy.

## What it never does

It is **read-only against the chain**. It holds no spending keys, signs no
transactions, and cannot move your funds — it only asks the explorer "did
`N` sats land at this address?". The only key it holds is the **licence**-signing
key (a code-signing key, like a release key), auto-generated on first boot.

## Run

```bash
cd mint
npm ci
cp .env.example .env      # fill in MINT_BTC_ADDRESS (and optionally a price)
npm start                 # http://localhost:8787
```

With nothing configured it still boots and serves `/health` + `/pubkey`, but
`/checkout` returns `503 unconfigured` until `MINT_BTC_ADDRESS` is set — the code
is done regardless; the address is the operate step.

Docker:

```bash
docker build -t exporter-mint ./mint
docker run -p 8787:8787 --env-file mint/.env -v "$PWD/mint/.data:/app/.data" exporter-mint
```

## Endpoints

| Method | Path          | Purpose |
|--------|---------------|---------|
| GET    | `/health`     | Liveness + whether the mint is configured to sell. |
| GET    | `/pubkey`     | The ECDSA **public** JWK to embed in the product build. |
| POST   | `/checkout`   | `{ email? }` → an order with a unique sat amount + BIP21 `payUri`. |
| GET    | `/order/:id`  | Poll; mints + returns the `license` once payment confirms. |

## Wire it to the product

1. `npm run keygen` — prints the mint's **public** JWK (private half stays in the
   gitignored keyfile).
2. Set it as the product build env `VITE_EXPORTER_PUBLIC_JWK` so the userscript
   verifies licences this mint signs (see `../src/utils/license.ts`).
3. Point the Exporter's "Buy Pro" button at the mint's hosted checkout page;
   the page redirects the buyer back with `?ce_license_key=<licence>`, which the
   product captures automatically (`captureLicenseFromUrl`).

## Configuration

See [`.env.example`](./.env.example). The one self-custodied value is
`MINT_BTC_ADDRESS` — a Bitcoin address from any wallet you control. Swap
`MINT_EXPLORER_BASE` for your own self-hosted mempool/Electrs instance to drop
the last third-party read, too.
