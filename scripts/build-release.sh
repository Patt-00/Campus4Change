#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
artifact_mode=both
case "$#" in
  0) ;;
  1)
    case "$1" in
      --apk-only) artifact_mode=apk ;;
      --apk-and-bundle) artifact_mode=both ;;
      --help|-h)
        printf 'Usage: %s [--apk-only|--apk-and-bundle]\n' "$0"
        exit 0
        ;;
      *) printf 'Unknown option: %s\nUsage: %s [--apk-only|--apk-and-bundle]\n' "$1" "$0" >&2; exit 2 ;;
    esac
    ;;
  *) printf 'Usage: %s [--apk-only|--apk-and-bundle]\n' "$0" >&2; exit 2 ;;
esac
key_alias="${C4C_RELEASE_KEY_ALIAS:-campus4change-v4}"
keystore_dir="${HOME}/.android/keystores"
keystore_file="${C4C_RELEASE_STORE_FILE:-${keystore_dir}/campus4change-release-v4.jks}"
keyring_account="${C4C_RELEASE_KEYRING_ACCOUNT:-campus4change-release-v4}"

umask 077
[[ "$keystore_file" = /* ]] || {
  printf 'C4C_RELEASE_STORE_FILE must be an absolute path.\n' >&2
  exit 1
}
install -d -m 700 "$(dirname -- "$keystore_file")"

command -v keytool >/dev/null || {
  printf 'keytool is required; install a JDK before building the release.\n' >&2
  exit 1
}

keyring_service="campus4change-release-signing"
keyring_password_loaded=false
if [[ -z "${C4C_RELEASE_STORE_PASSWORD:-}" ]] && command -v secret-tool >/dev/null; then
  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    session_bus="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/bus"
    if [[ -S "$session_bus" ]]; then
      export DBUS_SESSION_BUS_ADDRESS="unix:path=$session_bus"
    fi
  fi
  if [[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    C4C_RELEASE_STORE_PASSWORD="$(secret-tool lookup \
      service "$keyring_service" \
      account "$keyring_account" 2>/dev/null || true)"
    if [[ -n "$C4C_RELEASE_STORE_PASSWORD" ]]; then
      keyring_password_loaded=true
    fi
  fi
fi

if [[ -n "${C4C_RELEASE_STORE_PASSWORD:-}" && -z "${C4C_RELEASE_KEY_PASSWORD:-}" ]]; then
  C4C_RELEASE_KEY_PASSWORD="$C4C_RELEASE_STORE_PASSWORD"
fi
export C4C_RELEASE_STORE_PASSWORD C4C_RELEASE_KEY_PASSWORD

if [[ ! -f "$keystore_file" && "${C4C_CREATE_RELEASE_KEY:-}" != "1" ]]; then
  printf 'Release keystore not found: %s\n' "$keystore_file" >&2
  printf 'Restore the intended v4 keystore. Set C4C_CREATE_RELEASE_KEY=1 only for an explicitly approved key rotation.\n' >&2
  exit 1
fi

if [[ ! -f "$keystore_file" ]]; then
  printf 'Creating a new private release key at %s\n' "$keystore_file"
  if [[ -n "${C4C_RELEASE_STORE_PASSWORD:-}" && -n "${C4C_RELEASE_KEY_PASSWORD:-}" ]]; then
    keytool -genkeypair -v \
      -keystore "$keystore_file" \
      -storetype JKS \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -alias "$key_alias" \
      -dname 'CN=Campus4Change Release, OU=Mobile App, O=Campus4Change, L=Quezon City, ST=Metro Manila, C=PH' \
      -storepass:env C4C_RELEASE_STORE_PASSWORD \
      -keypass:env C4C_RELEASE_KEY_PASSWORD
  else
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
fi

[[ -r "$keystore_file" ]] || {
  printf 'Release keystore is not readable: %s\n' "$keystore_file" >&2
  exit 1
}
chmod 600 "$keystore_file"
umask 022

cleanup() {
  unset C4C_RELEASE_STORE_FILE C4C_RELEASE_STORE_PASSWORD
  unset C4C_RELEASE_KEY_ALIAS C4C_RELEASE_KEY_PASSWORD C4C_CREATE_RELEASE_KEY
  unset C4C_RELEASE_KEYRING_ACCOUNT
}
trap cleanup EXIT

if [[ -z "${C4C_RELEASE_STORE_PASSWORD:-}" ]]; then
  if ! IFS= read -r -s -p 'Release keystore password: ' C4C_RELEASE_STORE_PASSWORD </dev/tty; then
    printf '\nCould not read the keystore password from this terminal.\n' >&2
    exit 1
  fi
  printf '\n' >/dev/tty
fi

if [[ -z "${C4C_RELEASE_KEY_PASSWORD:-}" ]]; then
  if ! IFS= read -r -s -p 'Release key password: ' C4C_RELEASE_KEY_PASSWORD </dev/tty; then
    printf '\nCould not read the key password from this terminal.\n' >&2
    exit 1
  fi
  printf '\n' >/dev/tty
fi

if [[ -z "$C4C_RELEASE_STORE_PASSWORD" || -z "$C4C_RELEASE_KEY_PASSWORD" ]]; then
  printf 'A signing password was empty; no release build was run.\n' >&2
  exit 1
fi

export C4C_RELEASE_STORE_FILE="$keystore_file"
export C4C_RELEASE_STORE_PASSWORD
export C4C_RELEASE_KEY_ALIAS="$key_alias"
export C4C_RELEASE_KEY_PASSWORD

release_tasks=(assembleRelease)
if [[ "$artifact_mode" == both ]]; then release_tasks+=(bundleRelease); fi
if [[ "${PREFIX:-}" == /data/data/com.termux/files/usr ]]; then
  (cd "$repo_root" && ./scripts/gradlew-termux.sh --no-daemon --max-workers=2 --console=plain "${release_tasks[@]}")
else
  (cd "$repo_root/android" && ./gradlew --no-daemon "${release_tasks[@]}")
fi

apk="$repo_root/android/app/build/outputs/apk/release/app-release.apk"
aab="$repo_root/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -s "$apk" || ( "$artifact_mode" == both && ! -s "$aab" ) ]]; then
  printf 'Gradle finished without the expected release artifact(s).\n' >&2
  exit 1
fi

printf '\nRelease APK built:\n%s\n' "$apk"
if [[ "$artifact_mode" == both ]]; then printf 'Release App Bundle built:\n%s\n' "$aab"; fi
printf '\nSHA-256:\n'
if command -v sha256sum >/dev/null 2>&1; then
  if [[ "$artifact_mode" == both ]]; then sha256sum "$apk" "$aab"; else sha256sum "$apk"; fi
elif command -v shasum >/dev/null 2>&1; then
  if [[ "$artifact_mode" == both ]]; then shasum -a 256 "$apk" "$aab"; else shasum -a 256 "$apk"; fi
else
  printf 'Install sha256sum or shasum to print artifact hashes.\n' >&2
  exit 1
fi
if [[ "$keyring_password_loaded" == true ]]; then
  printf '\nVerify the signing certificate; the password was read from GNOME Secret Service and was not printed.\n'
else
  printf '\nVerify the signing certificate and save both passwords in a password manager.\n'
fi
