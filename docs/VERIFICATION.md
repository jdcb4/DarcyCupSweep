# Verification

Run the strongest deterministic checks that exist in the current project before claiming work is complete.

## Standard checks

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
pnpm run verify
```

The combined `verify` script runs typecheck, lint, tests, and build.

## Codebase analysis

For significant implementation changes, consider adding Fallow or similar deterministic analysis:

```powershell
pnpm dlx fallow --no-cache --format human
```

If the tool is unavailable or not yet configured, record that it was skipped and perform a local code-quality review before final verification.

## Optional deeper checks

When investigating dead code, duplication, or unused dependencies, use tools appropriate to the project once dependencies exist, for example:

```powershell
pnpm dlx ts-prune
pnpm dlx knip
pnpm dlx jscpd .
```

These may report false positives for framework entrypoints, generated files, and runtime-only dependencies. Document false positives near the relevant config or in this file.

## Environment

- Node.js `>=22.13.0`
- pnpm `>=9.15.0`

