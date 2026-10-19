import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const firebaseConfigPath = path.join(
  projectRoot,
  'src/shared/backend/firebaseConfig.js',
);
const originalFirebaseConfig = await readFile(firebaseConfigPath);
const projectMarker = Buffer.from("projectId: 'campus4change'");
const emulatorMarker = Buffer.from("firebaseEmulatorHost = ''");

function countOccurrences(value, marker) {
  return value.toString().split(marker.toString()).length - 1;
}

if (
  countOccurrences(originalFirebaseConfig, projectMarker) !== 1 ||
  countOccurrences(originalFirebaseConfig, emulatorMarker) !== 1
) {
  throw new Error(
    'Expected the standard Campus4Change Firebase config. No files were changed.',
  );
}

const emulatorConfig = originalFirebaseConfig
  .toString()
  .replace("projectId: 'campus4change'", "projectId: 'demo-campus4change-rules'")
  .replace("firebaseEmulatorHost = ''", "firebaseEmulatorHost = '127.0.0.1'");
const gradleWrapper =
  process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const childEnvironment = { ...process.env };
const fedoraJavaHome = '/usr/lib/jvm/java-25-openjdk';
if (
  !childEnvironment.JAVA_HOME &&
  process.platform !== 'win32' &&
  existsSync(path.join(fedoraJavaHome, 'bin', 'java'))
) {
  childEnvironment.JAVA_HOME = fedoraJavaHome;
}

let child;
let interrupted = false;
const stopBuild = () => {
  interrupted = true;
  child?.kill('SIGINT');
};
process.once('SIGINT', stopBuild);

try {
  await writeFile(firebaseConfigPath, emulatorConfig);
  child = spawn(
    gradleWrapper,
    ['--no-daemon', '-Pc4cQaEmulators=true', ':app:assembleDebug'],
    {
      cwd: path.join(projectRoot, 'android'),
      env: childEnvironment,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  );
  const result = await new Promise(resolveResult => {
    child.once('error', error => resolveResult({ error }));
    child.once('close', (code, signal) => resolveResult({ code, signal }));
  });
  if (result.error) {
    throw result.error;
  }
  if (interrupted || result.code !== 0) {
    throw new Error(
      `QA build ${interrupted ? 'was interrupted' : `failed (${result.signal || result.code})`}.`,
    );
  }
  console.log(
    `Emulator-only QA APK built: ${path.join(
      projectRoot,
      'android/app/build/outputs/apk/debug/app-debug.apk',
    )}`,
  );
  console.log('Firebase emulator host: 127.0.0.1 (use adb reverse on physical devices).');
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolveClose => child.once('close', resolveClose));
  }
  await writeFile(firebaseConfigPath, originalFirebaseConfig);
  const restored = await readFile(firebaseConfigPath);
  if (!restored.equals(originalFirebaseConfig)) {
    throw new Error('Firebase config restoration failed.');
  }
  process.removeListener('SIGINT', stopBuild);
  console.log('Firebase config restored byte-for-byte.');
}
