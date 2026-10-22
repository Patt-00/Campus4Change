#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
key_alias="${C4C_RELEASE_KEY_ALIAS:-campus4change}"
keystore_dir="${HOME}/.android/keystores"
keystore_file="${C4C_RELEASE_STORE_FILE:-${keystore_dir}/campus4change-release-v3.jks}"

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
if [[ -n "${C4C_RELEASE_KEYRING_ACCOUNT:-}" ]]; then
  command -v secret-tool >/dev/null || {
    printf 'secret-tool is required when C4C_RELEASE_KEYRING_ACCOUNT is set.\n' >&2
    exit 1
  }
  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    session_bus="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/bus"
    [[ -S "$session_bus" ]] || {
      printf 'No desktop Secret Service session bus is available.\n' >&2
      exit 1
    }
    export DBUS_SESSION_BUS_ADDRESS="unix:path=$session_bus"
  fi
  if [[ -z "${C4C_RELEASE_STORE_PASSWORD:-}" ]]; then
    C4C_RELEASE_STORE_PASSWORD="$(secret-tool lookup \
      service "$keyring_service" \
      account "$C4C_RELEASE_KEYRING_ACCOUNT")"
    if [[ -n "$C4C_RELEASE_STORE_PASSWORD" ]]; then
      keyring_password_loaded=true
    fi
  fi
elif [[ -z "${C4C_RELEASE_STORE_PASSWORD:-}" ]] && command -v secret-tool >/dev/null; then
  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    session_bus="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/bus"
    if [[ -S "$session_bus" ]]; then
      export DBUS_SESSION_BUS_ADDRESS="unix:path=$session_bus"
    fi
  fi
  if [[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    service_match_count="$(secret-tool search service "$keyring_service" 2>/dev/null \
      | awk '/^\[/ { count++ } END { print count + 0 }' || true)"
    if [[ "$service_match_count" == 1 ]]; then
      C4C_RELEASE_STORE_PASSWORD="$(secret-tool lookup service "$keyring_service" 2>/dev/null || true)"
      if [[ -n "$C4C_RELEASE_STORE_PASSWORD" ]]; then
        keyring_password_loaded=true
      fi
    elif [[ "$service_match_count" -gt 1 ]]; then
      printf 'Multiple Secret Service items match %s; set C4C_RELEASE_KEYRING_ACCOUNT or use the hidden prompts.\n' \
        "$keyring_service" >&2
    fi
  fi
fi

if [[ -n "${C4C_RELEASE_STORE_PASSWORD:-}" && -z "${C4C_RELEASE_KEY_PASSWORD:-}" ]]; then
  C4C_RELEASE_KEY_PASSWORD="$C4C_RELEASE_STORE_PASSWORD"
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
  unset C4C_RELEASE_KEY_ALIAS C4C_RELEASE_KEY_PASSWORD
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

(cd "$repo_root/android" && ./gradlew --no-daemon assembleRelease bundleRelease)

apk="$repo_root/android/app/build/outputs/apk/release/app-release.apk"
aab="$repo_root/android/app/build/outputs/bundle/release/app-release.aab"
[[ -s "$apk" && -s "$aab" ]] || {
  printf 'Gradle finished without both expected release artifacts.\n' >&2
  exit 1
}

printf '\nRelease artifacts built:\n%s\n%s\n\nSHA-256:\n' "$apk" "$aab"
sha256sum "$apk" "$aab"
if [[ "$keyring_password_loaded" == true ]]; then
  printf '\nVerify the signing certificate; the password was read from GNOME Secret Service and was not printed.\n'
else
  printf '\nVerify the signing certificate and save both passwords in a password manager.\n'
fi
