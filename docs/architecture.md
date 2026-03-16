# Architecture Guide

This project uses file-based routing with Expo Router and feature-based implementation modules.

## Routing vs Features

- `app/*` defines navigation routes. Keep these files thin.
- `src/features/*` contains real screen logic, hooks, components, and feature-specific utilities.

Typical route wrapper:

```ts
export { default } from "@/features/some-feature/screens/SomeScreen";
```

## Folder Conventions

Each feature should use this shape when useful:

- `src/features/<feature>/screens/*`
- `src/features/<feature>/components/*`
- `src/features/<feature>/hooks/*`
- `src/features/<feature>/logic/*` (pure business rules, no React side effects)
- `src/features/<feature>/types.ts`
- `src/features/<feature>/styles.ts` (optional)

## Shared Code Rules

- Keep code in a feature by default.
- Promote to shared only after it is reused by at least two features.
- Shared folders:
  - `src/components/` reusable UI building blocks
  - `src/hooks/` reusable cross-feature hooks
  - `src/utils/` generic helpers
  - `src/lib/` external integrations/infrastructure

## Path Aliases

- `@/*` resolves both project root and `src/*`.
- This allows imports like `@/features/...` to resolve to `src/features/...` while root modules like `@/convex/...` still work.

## Practical Guidelines

- Prefer hooks for orchestration and data derivation.
- Keep presentational components focused on rendering.
- Keep route files stable and boring.
- Preserve behavior during refactors; split structure first, then improve internals.
