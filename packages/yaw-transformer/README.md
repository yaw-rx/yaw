# @yaw-rx/transformer

TypeScript build-time transformer. Injects the `accessor` keyword on `@state` fields and emits `__stateTypes` metadata for attribute codec marshalling. Runs via ts-patch.

```bash
npm install @yaw-rx/transformer --save-dev
npm run build
```
