import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function containsPrivateCredential(text) {
  if (/(?:sb_secret_|sbp_|ghp_|github_pat_)[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) return true;
  for (const token of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(token[0].split('.')[1], 'base64url')).role === 'service_role') return true;
    } catch { /* Not a JWT; no credential content is logged. */ }
  }
  return false;
}

export async function checkPublicSecrets(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await checkPublicSecrets(path);
    else if (/\.(?:js|mjs|html|json|map|txt|xml|css|md)$/.test(entry.name) &&
      containsPrivateCredential(await readFile(path, 'utf8'))) {
      throw new Error(`Private credential detected in public artifact: ${path}. Value withheld.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await checkPublicSecrets(resolve(process.argv[2] ?? 'out'));
  console.log('Public artifacts: no recognized privileged credentials.');
}
