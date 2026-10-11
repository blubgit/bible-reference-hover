import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(packageDir, "..", "..");

const packageJsonPath = path.join(packageDir, "package.json");
const rootPackageJsonPath = path.join(repoRoot, "package.json");
const manifestPath = path.join(repoRoot, "manifest.json");
const versionsPath = path.join(repoRoot, "versions.json");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const targetVersion = packageJson.version;

if (!/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  throw new Error(`Plugin version must use x.y.z semantic versioning: ${targetVersion}`);
}

const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf8"));
rootPackageJson.version = targetVersion;
writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + "\n");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = targetVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");

const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
versions[targetVersion] = manifest.minAppVersion;
writeFileSync(versionsPath, JSON.stringify(versions, null, "\t") + "\n");

console.log(`version set to ${targetVersion}`);
