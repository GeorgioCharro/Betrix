# SimCasino

SimCasino is a full-stack web application that demonstrates a casino style betting platform. The project is organised as a monorepo managed by **Turborepo** and **pnpm**. Both the API and the frontend are written entirely in **TypeScript** and share internal packages for linting, TypeScript configuration, database access and common game utilities.

## Monorepo structure

```
apps/
  api/       – Express + Apollo GraphQL server
  frontend/  – Vite/React client
packages/
  common/            – shared game logic and types
  db/                – Prisma client and schema
  config-eslint/     – shared ESLint rules
  config-typescript/ – shared tsconfig files
  jest-presets/      – Jest configuration
```

Each workspace uses the shared tooling and can be developed or built through `turbo` commands.

The API exposes both REST endpoints and an Apollo **GraphQL** server. GraphQL type definitions and resolvers live under `apps/api/src/graphql`.

Game logic is organised using a controller/service pattern in `apps/api/src/features/games`. Each game has its own controller handling HTTP requests and delegating to a service for the core mechanics.

## Technologies Used

- **Express** with **Apollo Server** for a GraphQL API
- **Prisma** ORM with a PostgreSQL database
- **Passport** for local and Google authentication
- **React** powered by **Vite** and **Tailwind CSS**
- **Apollo Client** and **TanStack Router** on the frontend
- **Turborepo** for task orchestration and **pnpm** workspaces

## Games

The platform currently includes the following provably fair games:

- Dice
- Roulette
- Mines
- Limbo
- Keno
- Plinkoo
- Blackjack

Game state and results can be queried via GraphQL or through the REST controllers.

## Getting Started

1. Install [pnpm](https://pnpm.io/) and [Node.js](https://nodejs.org/) (v18 or newer).
2. Create environment files from the provided `.env.example` files inside `apps/api` and `packages/db`.
3. Install dependencies:
   ```sh
   pnpm install
   ```
4. Run database migrations and generate the Prisma client:
   ```sh
   pnpm db:migrate
   pnpm db:generate
   ```
5. Start the development servers:
   ```sh
   pnpm dev
   ```
   This launches the API on port `5000` and the Vite frontend on port `3000` (or `5173` if using the default Vite port).

## Scripts

- `pnpm dev` – start all apps in development mode
- `pnpm build` – build all packages and apps
- `pnpm lint` – run ESLint across workspaces
- `pnpm test` – run tests (Jest)
- `pnpm typecheck` – run TypeScript type checking

## License

This project is provided without any explicit license. Use at your own discretion.
