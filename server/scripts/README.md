# Backend Scripts

This folder contains backend utility and regression scripts.

## Script

- `rbac-regression.js` — runs non-destructive permission checks against a running API server.
- `backfill-commission-payout-role.js` — sets `payoutRole` to `owner` for legacy commission rows where it is missing.

## Run

```bash
cd server
npm run test:rbac
npm run migrate:commission-payout-role
```

## Optional environment overrides

- `API_BASE_URL` (default: `http://localhost:5000/api`)
- `RBAC_ADMIN_EMAIL`, `RBAC_ADMIN_PASSWORD`
- `RBAC_MANAGER_EMAIL`, `RBAC_MANAGER_PASSWORD`

The script creates temporary `bursar` and `sales_rep` users for deterministic checks, then deactivates them automatically.

The commission backfill script only updates records with missing/empty `payoutRole`.
