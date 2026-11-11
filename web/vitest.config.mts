// Test tiers (contract rule 24): `*.test.ts` = offline unit, `*.integration.ts` = offline against committed data/files.
// Live tier (`*.live.ts`, real RPC) runs only via the root `pnpm test:live`.
// "server-only" resolves to the package's own empty.js, exactly what Next resolves under the react-server condition.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: here("./node_modules/server-only/empty.js") },
      { find: /^@\//, replacement: here("./") },
    ],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/*.integration.ts"],
  },
});
