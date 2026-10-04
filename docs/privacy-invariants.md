# eBrowser privacy invariants

Developer documentation for the privacy engine (`src/privacy/`, `include/ebrowser/privacy.h`).
These are the guarantees the engine holds — behavior that must not regress.

## Referrer-policy matrix

`eb_priv_apply_referrer()` decides the `Referer` header for a navigation
from `from` to `to`, under the configured `eb_referrer_policy_t`.

| Policy | Same-origin navigation | Cross-origin navigation |
|---|---|---|
| `EB_REF_FULL` | Full `from` URL | Full `from` URL |
| `EB_REF_ORIGIN_ONLY` (default) | `scheme://host/` | `scheme://host/` |
| `EB_REF_SAME_ORIGIN` | Full `from` URL | Empty |
| `EB_REF_NONE` | Empty | Empty |

### Fail-closed construction (the #28 hardening)

The function is built so a bug can only *under*-disclose, never over-disclose:

1. `ref` is zeroed **first**, before the policy switch. Every code path that
   cannot produce a complete result returns with the empty referrer intact.
2. **Never truncates.** If the origin (or full URL) does not fit in `max`,
   the function keeps the empty referrer instead of emitting a partial URL —
   a truncated URL can disclose a malformed partial path, which is worse
   than nothing.
3. Origin extraction requires a `://` separator. Malformed `from` URLs yield
   empty, not a guess.
4. `EB_REF_SAME_ORIGIN` compares scheme + host byte-for-byte (`fl != tl ||
   strncmp(...) != 0` → empty). Subdomains do not match.
5. NULL `priv`/`from`/`to`/`ref` or `max == 0` → return `-1`, `ref` untouched.

### Known quirk (documented, not fixed)

`p->referrers_stripped` is never incremented: the counter update used to sit
inside this function, but `p` is `const`, so the statement had no effect.
Fixing it means changing the function's signature — a public-API decision,
not a bounds fix. The counter stays at zero until that decision is made.

## Mode defaults

| Mode | Cookie policy | Referrer policy |
|---|---|---|
| Normal (default) | Block third-party | Origin-only |
| Incognito | Delete on close | Origin-only |
| Tor | Block all | None |

## Engine-wide guarantees

- **Tracking parameters** are stripped from URLs (`eb_priv_clean_url`;
  up to 64 params, maintainer-curated list, user-extensible via
  `eb_priv_add_tracking_param`).
- **Bounce tracking** is blocked — redirect chains through known tracker
  domains are not followed for attribution.
- **Third-party cookies** are blocked by default; Tor mode blocks all.
- **DNT (`DNT: 1`) and GPC** headers are injected when enabled.
- **First-party isolation** (`fpi_enabled`) and **storage partitioning**
  keep cross-site state separated.
- **HTTPS-only** mode refuses plaintext navigation.
- **Per-site exceptions** (`eb_priv_add_exception`) are explicit and bounded
  (max 128); there is no silent allowlist.

## What this doc does not cover

Fingerprinting resistance (canvas, fonts, UA reduction) is not yet part of
the engine — the struct has no fingerprinting knobs. That is the next
privacy milestone, not a current guarantee.
