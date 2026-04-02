/**
 * Vercel install hook: npm install in website/, then mirror packages into the
 * repo root node_modules so TypeScript can resolve modules when it follows
 * convex/_generated/api.d.ts into other convex TypeScript sources (convex/*,
 * @convex-dev/*, @better-auth/*, etc.). Website-only installs do not populate
 * ../node_modules by default.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const websiteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(websiteRoot, "..");

execSync("npm install", { cwd: websiteRoot, stdio: "inherit" });

if (process.env.VERCEL !== "1") {
  console.log(
    "[vercel-install] skip root node_modules links (set VERCEL=1 to run locally)"
  );
  process.exit(0);
}

function symlinkIntoRootNodeModules(relativePath) {
  const src = path.join(websiteRoot, "node_modules", relativePath);
  const dst = path.join(repoRoot, "node_modules", relativePath);
  if (!fs.existsSync(src)) {
    console.error(`[vercel-install] missing ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.symlinkSync(path.relative(path.dirname(dst), src), dst);
  console.log("[vercel-install] linked", dst, "->", src);
}

// Symlink convex from website (not a second install under .convex-vendor): two
// physical copies of convex produce incompatible GenericCtx types in tsc.
for (const name of ["convex", "@convex-dev", "@better-auth", "better-auth"]) {
  symlinkIntoRootNodeModules(name);
}
