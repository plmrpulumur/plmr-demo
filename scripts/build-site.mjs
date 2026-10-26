import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readPublicConfig} from './public-config.mjs';

const runtimeRoot = fileURLToPath(new URL('..', import.meta.url));
const publicEntries = ['index.html', 'assets', 'drawing-engine', 'PLMR_CUSTOMER_SETUP_TEMPLATE.xlsx'];
export async function filesIn(root) {
  const result = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, {withFileTypes: true})) {
      const name = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Error('Yayın paketinde sembolik bağlantı bulunamaz.');
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) result.push(name);
    }
  }
  await visit(root);
  return result.sort();
}
export async function buildSite(root = runtimeRoot, destination = path.join(root, '_site'), env = process.env) {
  root = path.resolve(root); destination = path.resolve(destination);
  if (destination === root || root.startsWith(destination + path.sep) || publicEntries.some(name => destination === path.join(root, name) || destination.startsWith(path.join(root, name) + path.sep))) {
    throw Error('Yayın çıktısı uygulama girişinin veya varlıklarının üzerine yazılamaz.');
  }
  const config = await readPublicConfig(root, env);
  for (const name of publicEntries) await fs.access(path.join(root, name));
  await fs.rm(destination, {recursive: true, force: true});
  await fs.mkdir(destination, {recursive: true});
  for (const name of publicEntries) {
    await fs.cp(path.join(root, name), path.join(destination, name), {
      recursive: true,
      // Node share service and development scaffolding cannot run on GitHub Pages.
      filter: source => source !== path.join(root,'drawing-engine/package.json') && !path.relative(root, source).split(path.sep).some(part => ['server', 'deployment', 'node_modules'].includes(part))
    });
  }
  await fs.writeFile(path.join(destination, '.nojekyll'), '');
  await fs.writeFile(path.join(destination, 'plmr-public-config.json'), JSON.stringify(config, null, 2) + '\n');
  const hashes = {};
  for (const file of await filesIn(destination)) {
    const content = await fs.readFile(file);
    if (content.length > 100 * 1024 * 1024) throw Error('Tek yayın dosyası GitHub 100 MiB sınırını aşıyor.');
    hashes[path.relative(destination, file).split(path.sep).join('/')] = crypto.createHash('sha256').update(content).digest('hex');
  }
  await fs.writeFile(path.join(destination, 'deployment-manifest.json'), JSON.stringify({
    release: 'PLMR_FinalProcess_v12', format: 1, selfExcluded: 'deployment-manifest.json',
    businessDataMode: 'supabase', supabaseConnectionConfigured: config.configured, files: hashes
  }, null, 2) + '\n');
  return {fileCount: Object.keys(hashes).length, configured: config.configured};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await buildSite(); console.log('Statik yayın hazır:', result.fileCount, 'dosya. Supabase ayarı:', result.configured ? 'girildi' : 'boş'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
