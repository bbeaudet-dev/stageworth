/**
 * Vercel install hook: `npm install` in website/, then mirror packages into the
 * repo root `node_modules/` so TypeScript can resolve modules when it follows
 * `convex/_generated/api.d.ts` into `convex/**/*.ts` (those files import
 * `convex/*`, `@convex-dev/*`, `@better-auth/*`, etc.). Website-only installs
 * do not populate ../node_modules by default.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const websiteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(websiteRoot, "..");
const vendorDir = path.join(repoRoot, ".convex-vendor");
const pkg = require(path.join(websiteRoot, "package.json"));
const convexVer = pkg.dependencies.convex;

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

fs.mkdirSync(vendorDir, { recursive: true });
execSync(`npm install --prefix ${JSON.stringify(vendorDir)} convex@${convexVer}`, {
  stdio: "inherit",
});

const convexTarget = path.join(vendorDir, "node_modules", "convex");
const convexLink = path.join(repoRoot, "node_modules", "convex");
fs.mkdirSync(path.dirname(convexLink), { recursive: true });
if (fs.existsSync(convexLink)) fs.rmSync(convexLink, { recursive: true, force: true });
fs.symlinkSync(path.relative(path.dirname(convexLink), convexTarget), convexLink);
console.log("[vercel-install] linked", convexLink, "->", convexTarget);

for (const name of ["@convex-dev", "@better-auth", "better-auth"]) {
  symlinkIntoRootNodeModules(name);
}
