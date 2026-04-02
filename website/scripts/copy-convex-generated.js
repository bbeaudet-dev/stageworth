/**
 * Copies ../convex/_generated JS files into website/convex_generated/ and
 * generates stub .d.ts files that re-export types from the originals.
 *
 * Why:
 *   Turbopack's module resolver walks upward from the importing file to find
 *   node_modules. Files outside website/ can't find "convex/server" in
 *   website/node_modules. Files inside website/ can.
 *
 *   We copy only the .js runtime files so the bundler stays inside website/.
 *   We create stub .d.ts files that re-export from the original repo-root
 *   location — TypeScript follows the re-export chain and gets proper types
 *   from the original declarations (whose relative imports are correct there).
 */

const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../../convex/_generated");
const dst = path.resolve(__dirname, "../convex_generated");

if (!fs.existsSync(src)) {
  console.warn(`[copy-convex-generated] Source not found: ${src}. Skipping.`);
  process.exit(0);
}

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });

for (const file of fs.readdirSync(src)) {
  if (file.endsWith(".js")) {
    fs.copyFileSync(path.join(src, file), path.join(dst, file));
    console.log(`  copied  ${file}`);
  } else if (file.endsWith(".d.ts")) {
    const base = file.replace(".d.ts", "");
    // Stub re-exports from the canonical repo-root declaration file.
    // TypeScript resolves the chain: stub → original → correct relative imports.
    const stub =
      `// Auto-generated stub — do not edit (see scripts/copy-convex-generated.js)\n` +
      `export * from "../../convex/_generated/${base}";\n`;
    fs.writeFileSync(path.join(dst, file), stub);
    console.log(`  stubbed ${file}`);
  }
}

console.log(`[copy-convex-generated] done → ${dst}`);
