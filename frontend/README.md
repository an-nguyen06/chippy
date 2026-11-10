# React + TypeScript + Vite

## Production authentication

Deploy this directory as the Vercel project root. Production API requests use
`/api`; `vercel.json` proxies them to the Render backend before the SPA rewrite.
This keeps authentication cookies on the frontend origin and avoids cross-origin
API preflights. Redeploy Vercel after changing the proxy or frontend code.

On Render, set `NODE_ENV=production` for secure refresh cookies and
`CLIENT_ORIGIN=https://chippy-ten.vercel.app` for direct Socket.IO connections.
If the backend URL changes, update the API rewrite and `VITE_SOCKET_URL` in
`.env.production`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
