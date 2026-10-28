#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:---debug}"
if [[ "$#" -gt 1 || ( "$mode" != "--debug" && "$mode" != "--release" && "$mode" != "--both" && "$mode" != "--help" ) ]]; then
  printf 'Usage: %s [--debug|--release|--both]\n' "$0" >&2
  exit 2
fi
if [[ "$mode" == --help ]]; then
  printf 'Build APKs for Campus4Change 1.4.4.\nUsage: %s [--debug|--release|--both]\n' "$0"
  exit 0
fi

env_file="$repo_root/.c4c-build-env.sh"
if [[ -f "$env_file" ]]; then
  # shellcheck source=/dev/null
  source "$env_file"
fi

termux=false
case "$(uname -s)" in
  Darwin) platform=macos ;;
  Linux)
    if [[ "${PREFIX:-}" == /data/data/com.termux/files/usr ]]; then
      platform=termux
      termux=true
    else
      platform=linux
    fi
    ;;
  *) printf 'Use scripts/build-apk.ps1 on Windows.\n' >&2; exit 2 ;;
esac
case "$platform" in
  termux) sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}" ;;
  macos) sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}" ;;
  *) sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}" ;;
esac

find_jdk17() {
  local candidate version
  if [[ "$termux" == true ]]; then
    candidate="$PREFIX/lib/jvm/java-17-openjdk"
    [[ -x "$candidate/bin/javac" ]] || return 1
    printf '%s\n' "$candidate"
    return 0
  fi
  if [[ "$platform" == macos && -x /usr/libexec/java_home ]]; then
    candidate="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
    if [[ -n "$candidate" && -x "$candidate/bin/javac" ]]; then printf '%s\n' "$candidate"; return 0; fi
  fi
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/javac" ]]; then
    version="$("$JAVA_HOME/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
    if [[ "$version" == 17 ]]; then printf '%s\n' "$JAVA_HOME"; return 0; fi
  fi
  if [[ "$platform" == linux ]]; then
    for candidate in "$HOME/.local/share/campus4change/toolchains/temurin-17" /usr/lib/jvm/*; do
      if [[ -x "$candidate/bin/javac" ]]; then
        version="$("$candidate/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
        if [[ "$version" == 17 ]]; then printf '%s\n' "$candidate"; return 0; fi
      fi
    done
  fi
  return 1
}

if [[ "$termux" == true ]]; then
  ANDROID_HOME="$sdk_root"
  ANDROID_SDK_ROOT="$sdk_root"
  JAVA_HOME="${JAVA_HOME:-$PREFIX/lib/jvm/java-17-openjdk}"
  TMPDIR="${TMPDIR:-$PREFIX/tmp}"
  LD_PRELOAD="${LD_PRELOAD:-$PREFIX/lib/libtermux-exec.so}"
  export ANDROID_HOME ANDROID_SDK_ROOT JAVA_HOME TMPDIR LD_PRELOAD
fi

if [[ -x "${JAVA_HOME:-}/bin/javac" ]]; then
  current_jdk="$("$JAVA_HOME/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
else
  current_jdk=""
fi
if [[ "$current_jdk" != 17 ]]; then
  JAVA_HOME="$(find_jdk17)" || {
    printf 'JDK 17 is not configured. Run scripts/setup-build.sh --setup, then source its environment file.\n' >&2
    exit 1
  }
  export JAVA_HOME
fi
export ANDROID_HOME="$sdk_root" ANDROID_SDK_ROOT="$sdk_root"
export PATH="$JAVA_HOME/bin:$sdk_root/platform-tools:$PATH"

if ! "$repo_root/scripts/setup-build.sh" --check; then
  printf '\nComplete the missing prerequisite or SDK license step before building.\n' >&2
  exit 1
fi

verify_apk() {
  local apk="$1" signer
  [[ -s "$apk" ]] || { printf 'APK was not created: %s\n' "$apk" >&2; exit 1; }
  if [[ "$termux" == true ]]; then
    signer="$(command -v apksigner || true)"
  else
    signer="$sdk_root/build-tools/37.0.0/apksigner"
  fi
  [[ -x "$signer" ]] || { printf 'apksigner was not found: %s\n' "$signer" >&2; exit 1; }
  "$signer" verify --verbose "$apk"
  printf '\nAPK: %s\nSHA-256: ' "$apk"
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$apk" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$apk" | awk '{print $1}'
  else printf 'No SHA-256 command found.\n' >&2; exit 1
  fi
}

build_debug() {
  if [[ "$termux" == true ]]; then
    "$repo_root/scripts/gradlew-termux.sh" assembleDebug --no-daemon --max-workers=2 --console=plain
  else
    (cd "$repo_root/android" && ./gradlew --no-daemon assembleDebug)
  fi
  verify_apk "$repo_root/android/app/build/outputs/apk/debug/app-debug.apk"
}

build_release() {
  if [[ "${C4C_CREATE_RELEASE_KEY:-}" == 1 ]]; then
    printf 'build-apk.sh requires the existing v4 release keystore and will not create a replacement key.\n' >&2
    exit 1
  fi
  "$repo_root/scripts/build-release.sh" --apk-only
  verify_apk "$repo_root/android/app/build/outputs/apk/release/app-release.apk"
}

case "$mode" in
  --debug) build_debug ;;
  --release) build_release ;;
  --both) build_debug; build_release ;;
esac
