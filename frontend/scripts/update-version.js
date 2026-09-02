import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// package.json のパス
const packageJsonPath = path.join(__dirname, '../package.json');
// アプリ内で使うバージョン定数ファイルのパス
const versionFilePath = path.join(__dirname, '../src/version.ts');

// package.json を読み込む
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let currentVer = packageJson.version; // 例: "2.3.6"

console.log(`Current Version: ${currentVer}`);

// バージョンを分解 (メジャー.マイナー.パッチ)
let [major, minor, patch] = currentVer.split('.').map(Number);

// --- カウントアップのロジック ---
patch += 1;

// パッチが99を超えたら
if (patch > 99) {
  patch = 0;
  minor += 1;
}

// マイナーが20を超えたら
if (minor > 20) {
  minor = 0;
  major += 1;
}

// メジャーが20を超えたら (要件に合わせてリセットするか、そのままにするか。今回はリセットせず21になるようにしますが、必要なら制限を追加できます)
// if (major > 20) { major = 0; } 

const newVer = `${major}.${minor}.${patch}`;
console.log(`New Version:     ${newVer}`);

// 1. package.json を更新
packageJson.version = newVer;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// 2. src/version.ts を生成 (Reactアプリが読み込む用)
const versionFileContent = `export const APP_VERSION = '${newVer}';\n`;
fs.writeFileSync(versionFilePath, versionFileContent);

console.log('✅ Version updated successfully.');