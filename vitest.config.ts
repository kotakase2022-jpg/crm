import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    coverage: {
      provider: "v8",
      skipFull: false,
      reportsDirectory: "coverage",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "src/lib/crm/access.ts",
        "src/lib/crm/activity-next-action.ts",
        "src/lib/crm/automation.ts",
        "src/lib/crm/alerts.ts",
        "src/lib/crm/analytics.ts",
        "src/lib/crm/api.ts",
        "src/lib/crm/csv.ts",
        "src/lib/crm/format.ts",
        "src/lib/crm/health.ts",
        "src/lib/crm/lead-import-utils.ts",
        "src/lib/crm/navigation.ts",
        "src/lib/crm/persistence.ts",
        "src/lib/crm/related.ts",
        "src/lib/crm/search.ts",
        "src/lib/crm/usage.ts",
        "src/lib/crm/validation.ts",
        "src/lib/supabase/proxy.ts",
        "src/lib/utils.ts",
      ],
      thresholds: {
        lines: 75,
        branches: 65,
        functions: 75,
        statements: 75,
      },
    },
  },
});
