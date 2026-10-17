#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
key_alias="campus4change"
keystore_dir="${HOME}/.android/keystores"
keystore_file="${keystore_dir}/campus4change-release-v2.jks"

umask 077
install -d -m 700 "$keystore_dir"

command -v keytool >/dev/null || {
  printf 'keytool is required; install a JDK before building the release.\n' >&2
  exit 1
}

if [[ ! -f "$keystore_file" ]]; then
  printf 'Creating a new private release key at %s\n' "$keystore_file"
  printf 'Enter and securely save the keystore and key passwords when prompted.\n'
  keytool -genkeypair -v \
    -keystore "$keystore_file" \
    -storetype JKS \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias "$key_alias" \
    -dname 'CN=Campus4Change Release, OU=Mobile App, O=Campus4Change, L=Quezon City, ST=Metro Manila, C=PH'
fi

[[ -r "$keystore_file" ]] || {
  printf 'Release keystore is not readable: %s\n' "$keystore_file" >&2
  exit 1
}
chmod 600 "$keystore_file"
umask 022

cleanup() {
  unset C4C_RELEASE_STORE_FILE C4C_RELEASE_STORE_PASSWORD
  unset C4C_RELEASE_KEY_ALIAS C4C_RELEASE_KEY_PASSWORD
}
trap cleanup EXIT

if ! IFS= read -r -s -p 'Release keystore password: ' C4C_RELEASE_STORE_PASSWORD </dev/tty; then
  printf '\nCould not read the keystore password from this terminal.\n' >&2
  exit 1
fi
printf '\n' >/dev/tty

if ! IFS= read -r -s -p 'Release key password: ' C4C_RELEASE_KEY_PASSWORD </dev/tty; then
  printf '\nCould not read the key password from this terminal.\n' >&2
  exit 1
fi
printf '\n' >/dev/tty

if [[ -z "$C4C_RELEASE_STORE_PASSWORD" || -z "$C4C_RELEASE_KEY_PASSWORD" ]]; then
  printf 'A signing password was empty; no release build was run.\n' >&2
  exit 1
fi

export C4C_RELEASE_STORE_FILE="$keystore_file"
export C4C_RELEASE_STORE_PASSWORD
export C4C_RELEASE_KEY_ALIAS="$key_alias"
export C4C_RELEASE_KEY_PASSWORD

(cd "$repo_root/android" && ./gradlew --no-daemon assembleRelease bundleRelease)

apk="$repo_root/android/app/build/outputs/apk/release/app-release.apk"
aab="$repo_root/android/app/build/outputs/bundle/release/app-release.aab"
[[ -s "$apk" && -s "$aab" ]] || {
  printf 'Gradle finished without both expected release artifacts.\n' >&2
  exit 1
}

printf '\nRelease artifacts built:\n%s\n%s\n\nSHA-256:\n' "$apk" "$aab"
sha256sum "$apk" "$aab"
printf '\nVerify the signing certificate and save both passwords in a password manager.\n'
