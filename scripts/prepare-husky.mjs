import { existsSync } from "node:fs";

if (!existsSync(".git")) {
  process.exit(0);
}

try {
  const { default: husky } = await import("husky");
  const result = husky();
  if (result) console.log(result);
} catch (error) {
  if (process.env.NODE_ENV !== "production") {
    throw error;
  }
}
