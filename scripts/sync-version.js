import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 1. Read the new version from package.json (already bumped by npm version)
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

console.log(`Syncing version ${newVersion} to Tauri files...`);

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('Updated tauri.conf.json');

// 3. Update src-tauri/Cargo.toml
const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
let cargoToml = readFileSync(cargoTomlPath, 'utf8');
// Naive regex replacement for the package version
// Matches version = "x.y.z" strictly under [package] hopefully, but usually safe if it's near the top
cargoToml = cargoToml.replace(/^version = ".*"/m, `version = "${newVersion}"`);
writeFileSync(cargoTomlPath, cargoToml);
console.log('Updated Cargo.toml');

// 4. Update Cargo.lock (by running cargo check)
console.log('Updating Cargo.lock...');
try {
    execSync('cargo check', { cwd: join(rootDir, 'src-tauri'), stdio: 'inherit' });
} catch (e) {
    console.error('Warning: Failed to update Cargo.lock via cargo check. Please verify Rust setup.');
}

// 5. Git add the changed files
console.log('Staging files...');
execSync(`git add "${tauriConfPath}" "${cargoTomlPath}" "${join(rootDir, 'src-tauri', 'Cargo.lock')}"`, { stdio: 'inherit' });

console.log('Version sync complete.');
