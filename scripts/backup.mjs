/**
 * Backup consistente do banco SQLite (mesmo com o servidor no ar) e cópia das imagens.
 *   npm run backup                 # grava em ./backups/AAAA-MM-DD_HHMMSS/
 *   npm run backup -- /outro/dir
 */
import { existsSync, mkdirSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

if (existsSync('.env')) process.loadEnvFile('.env');

const dataDir = resolve(process.env.DATA_DIR || './data');
const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '').replace('T', '_');
const target = resolve(process.argv[2] || './backups', stamp);
mkdirSync(target, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'site.db'), { readOnly: true });
await backup(db, join(target, 'site.db'));
db.close();

if (existsSync(join(dataDir, 'uploads'))) {
  await cp(join(dataDir, 'uploads'), join(target, 'uploads'), { recursive: true });
}
console.log(`Backup gravado em ${target}`);
