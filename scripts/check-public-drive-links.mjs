import { spawnSync } from 'node:child_process';

const driveFileUrlPattern =
  'https?://(docs|drive)\\.google\\.com/';

const scan = spawnSync(
  'git',
  ['grep', '-i', '-n', '-I', '-E', driveFileUrlPattern, '--', '.'],
  { encoding: 'utf8' },
);

if (scan.error || (scan.status !== 0 && scan.status !== 1)) {
  console.error('Could not scan tracked files for Google Drive links.');
  process.exit(2);
}

if (scan.status === 1) {
  console.log('No Google Drive file links found in tracked files.');
  process.exit(0);
}

const locations = scan.stdout
  .split(/\r?\n/)
  .map(line => line.match(/^([^:]+):(\d+):/))
  .filter(Boolean)
  .map(([, path, line]) => `${path}:${line}`);

console.error(
  'Remove Google Drive file links from the public repository. Matches:',
);
for (const location of locations) {
  console.error(`- ${location}`);
}
process.exit(1);
