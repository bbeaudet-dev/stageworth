/**
 * Vercel install hook: dependencies for website/, plus a minimal convex install
 * at repo root so TypeScript can resolve `convex/values` when it follows imports
 * from convex/_generated/api.d.ts into repo convex TypeScript sources (website-only installs
 * do not populate ../node_modules by default).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const websiteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(websiteRoot, "..");
const vendorDir = path.join(repoRoot, ".convex-vendor");
const convexVer = require(path.join(websiteRoot, "package.json")).dependencies
  .convex;

execSync("npm install", { cwd: websiteRoot, stdio: "inherit" });

if (process.env.VERCEL !== "1") {
  console.log(
    "[vercel-install] skip root convex vendor (set VERCEL=1 to run it locally)"
  );
  process.exit(0);
}

fs.mkdirSync(vendorDir, { recursive: true });
execSync(`npm install --prefix ${JSON.stringify(vendorDir)} convex@${convexVer}`, {
  stdio: "inherit",
});

const target = path.join(vendorDir, "node_modules", "convex");
const linkPath = path.join(repoRoot, "node_modules", "convex");
fs.mkdirSync(path.dirname(linkPath), { recursive: true });

if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true, force: true });
fs.symlinkSync(path.relative(path.dirname(linkPath), target), linkPath);

console.log("[vercel-install] linked", linkPath, "->", target);
