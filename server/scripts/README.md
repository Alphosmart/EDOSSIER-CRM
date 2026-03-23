# RBAC Regression Script

This folder contains backend role-access regression checks.

## Script

- `rbac-regression.js` — runs non-destructive permission checks against a running API server.

## Run

```bash
cd server
npm run test:rbac
```

## Optional environment overrides

- `API_BASE_URL` (default: `http://localhost:5000/api`)
- `RBAC_ADMIN_EMAIL`, `RBAC_ADMIN_PASSWORD`
- `RBAC_MANAGER_EMAIL`, `RBAC_MANAGER_PASSWORD`

The script creates temporary `bursar` and `sales_rep` users for deterministic checks, then deactivates them automatically.
