#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:---check}"
if [[ "$#" -gt 1 || ( "$mode" != "--check" && "$mode" != "--setup" ) ]]; then
  printf 'Usage: %s [--check|--setup]\n' "$0" >&2
  exit 2
fi

termux=false
case "$(uname -s)" in
  Darwin) platform=macos ;;
  Linux)
    if [[ "${PREFIX:-}" == /data/data/com.termux/files/usr ]]; then
      platform=termux
      termux=true
    else platform=linux
    fi
    ;;
  *) printf 'Use scripts/setup-build.ps1 on Windows.\n' >&2; exit 2 ;;
esac
case "$platform" in
  termux) sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}" ;;
  macos) sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}" ;;
  *) sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}" ;;
esac
if "$termux"; then
  TMPDIR="${TMPDIR:-$PREFIX/tmp}"
  export TMPDIR
fi
sdkmanager_path=""
temurin_temp_dir=""
node_temp_dir=""
sdktools_temp_dir=""
license_log_file=""
node_bin_prefix=""
cleanup_setup_temp() {
  if [[ -n "$temurin_temp_dir" && -d "$temurin_temp_dir" ]]; then
    rm -rf -- "$temurin_temp_dir"
  fi
  if [[ -n "$node_temp_dir" && -d "$node_temp_dir" ]]; then
    rm -rf -- "$node_temp_dir"
  fi
  if [[ -n "$sdktools_temp_dir" && -d "$sdktools_temp_dir" ]]; then
    rm -rf -- "$sdktools_temp_dir"
  fi
  if [[ -n "$license_log_file" && -f "$license_log_file" ]]; then
    rm -f -- "$license_log_file"
  fi
}
trap cleanup_setup_temp EXIT
if [[ "$platform" == macos ]] && command -v brew >/dev/null 2>&1; then
  node_prefix="$(brew --prefix node@24 2>/dev/null || true)"
  if [[ -n "$node_prefix" && -x "$node_prefix/bin/node" ]]; then
    node_bin_prefix="$node_prefix/bin"
    export PATH="$node_bin_prefix:$PATH"
  fi
fi

note() { printf '[setup] %s\n' "$*"; }
pass() { printf '[ok] %s\n' "$*"; }
missing=()
miss() { missing+=("$1"); printf '[missing] %s\n' "$1"; }

node_is_supported() {
  command -v node >/dev/null 2>&1 || return 1
  local version major minor
  version="$(node -p 'process.versions.node' 2>/dev/null || true)"
  IFS=. read -r major minor _ <<<"$version"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] || return 1
  (( (major == 22 && minor >= 13) || (major == 24 && minor >= 3) || major >= 26 ))
}

jdk_home_for_17() {
  local candidate version
  if [[ "$platform" == macos && -x /usr/libexec/java_home ]]; then
    candidate="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
    if [[ -n "$candidate" && -x "$candidate/bin/javac" ]]; then printf '%s\n' "$candidate"; return 0; fi
  fi
  if [[ "$platform" == termux && -x "$PREFIX/lib/jvm/java-17-openjdk/bin/javac" ]]; then
    candidate="$PREFIX/lib/jvm/java-17-openjdk"
    version="$("$candidate/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
    if [[ "$version" == 17 ]]; then printf '%s\n' "$candidate"; return 0; fi
  fi
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/javac" ]]; then
    version="$("$JAVA_HOME/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
    if [[ "$version" == 17 ]]; then printf '%s\n' "$JAVA_HOME"; return 0; fi
  fi
  if command -v javac >/dev/null 2>&1 && command -v readlink >/dev/null 2>&1; then
    candidate="$(readlink -f "$(command -v javac)" 2>/dev/null || true)"
    if [[ -n "$candidate" ]]; then
      candidate="$(dirname -- "$(dirname -- "$candidate")")"
      version="$("$candidate/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
      if [[ "$version" == 17 ]]; then printf '%s\n' "$candidate"; return 0; fi
    fi
  fi
  if [[ "$platform" == linux ]]; then
    for candidate in /usr/lib/jvm/* "$HOME/.local/share/campus4change/toolchains/temurin-17"; do
      if [[ -x "$candidate/bin/javac" ]]; then
        version="$("$candidate/bin/javac" -version 2>&1 | awk '{print $2}' | cut -d. -f1)"
        if [[ "$version" == 17 ]]; then printf '%s\n' "$candidate"; return 0; fi
      fi
    done
  fi
  return 1
}

find_sdkmanager() {
  local candidate
  for candidate in "$sdk_root"/cmdline-tools/*/bin/sdkmanager "$sdk_root"/cmdline-tools/*/bin/sdkmanager.bat; do
    if [[ -x "$candidate" ]]; then printf '%s\n' "$candidate"; return 0; fi
  done
  if command -v sdkmanager >/dev/null 2>&1; then command -v sdkmanager; return 0; fi
  return 1
}

check_sdk_license_status() {
  local sdk_java_home previous_java_home sdk_status
  sdk_java_home="$(jdk_home_for_17 2>/dev/null || true)"
  [[ -n "$sdk_java_home" ]] || return 2
  previous_java_home="${JAVA_HOME:-}"
  JAVA_HOME="$sdk_java_home"
  export JAVA_HOME
  license_log_file="${TMPDIR:-/tmp}/campus4change-sdk-licenses-$$.log"
  if "$sdkmanager_path" --sdk_root="$sdk_root" --licenses </dev/null > "$license_log_file" 2>&1; then
    sdk_status=0
  else
    sdk_status=$?
  fi
  if [[ -n "$previous_java_home" ]]; then export JAVA_HOME="$previous_java_home"; else unset JAVA_HOME; fi
  (( sdk_status == 0 )) || return 2
  if grep -Eiq 'not accepted|review licenses that have not been accepted|accept the license agreements' "$license_log_file"; then
    return 1
  fi
  return 0
}

check_requirements() {
  missing=()
  if command -v git >/dev/null 2>&1; then pass "Git"; else miss "Git"; fi
  if node_is_supported; then pass "Supported Node.js $(node --version)"; else miss "Supported Node.js and npm"; fi
  if command -v npm >/dev/null 2>&1; then pass "npm"; else miss "npm"; fi
  local java17
  if java17="$(jdk_home_for_17)"; then pass "JDK 17 at $java17"; else miss "JDK 17"; fi
  if [[ -f "$repo_root/node_modules/react-native/package.json" ]]; then pass "npm dependencies"; else miss "npm dependencies"; fi
  if sdkmanager_path="$(find_sdkmanager)"; then
    pass "Android SDK Manager"
    if jdk_home_for_17 >/dev/null; then
      if check_sdk_license_status; then
        pass "Android SDK licenses"
      else
        if [[ -n "$license_log_file" && -f "$license_log_file" ]]; then
          grep -Ei 'not accepted|review licenses that have not been accepted' "$license_log_file" | tail -1 || true
        fi
        miss "Android SDK licenses (review and accept interactively)"
      fi
    else
      note "SDK license status will be checked after JDK 17 is available."
    fi
  else
    miss "Android SDK Command-line Tools (sdkmanager)"
  fi
  if [[ -f "$sdk_root/platforms/android-37.0/android.jar" ]]; then pass "Android SDK Platform 37.0"; else miss "Android SDK Platform 37.0"; fi
  if [[ -f "$sdk_root/build-tools/37.0.0/aapt2" ]]; then pass "Android Build Tools 37.0.0"; else miss "Android Build Tools 37.0.0"; fi
  if [[ -f "$sdk_root/ndk/27.1.12297006/source.properties" ]]; then pass "Android NDK 27.1.12297006"; else miss "Android NDK 27.1.12297006"; fi
  if [[ -f "$sdk_root/cmake/3.22.1/bin/cmake" || -x "${PREFIX:-/nonexistent}/bin/cmake" ]]; then pass "CMake"; else miss "CMake 3.22.1"; fi
  if "$termux"; then
    local tndk="$HOME/termux-ndk-27.1.12297006"
    if [[ -f "$tndk/source.properties" ]] && grep -Fq 'Pkg.Revision = 27.1.12297006' "$tndk/source.properties" && [[ -x "$PREFIX/bin/aapt2" && -x "$PREFIX/bin/clang" ]]; then
      pass "Termux-compatible NDK, clang, and aapt2"
    else miss "Termux-compatible NDK, clang, and aapt2"; fi
  else
    if [[ -f "$sdk_root/platform-tools/adb" ]]; then pass "Android Platform-Tools"; else miss "Android Platform-Tools"; fi
  fi
  if [[ -f "$repo_root/android/local.properties" ]] && grep -q '^sdk\.dir=' "$repo_root/android/local.properties"; then
    pass "android/local.properties"
  else
    miss "android/local.properties"
  fi
}

install_host_packages() {
  local missing_common=false cmd
  case "$platform" in
    termux)
      pkg install -y git nodejs openjdk-17 curl unzip zip cmake ninja make clang aapt2 d8 apksigner ndk-sysroot ndk-multilib qemu-user-x86-64
      ;;
    macos)
      command -v brew >/dev/null 2>&1 || { note "Install Homebrew first, then rerun setup."; return 1; }
      if ! command -v git >/dev/null 2>&1; then brew install git; fi
      if ! node_is_supported || ! command -v npm >/dev/null 2>&1; then brew install node@24; fi
      node_prefix="$(brew --prefix node@24 2>/dev/null || true)"
      if [[ -n "$node_prefix" && -x "$node_prefix/bin/node" ]]; then
        node_bin_prefix="$node_prefix/bin"
        export PATH="$node_bin_prefix:$PATH"
      fi
      if ! jdk_home_for_17 >/dev/null; then brew install --cask temurin@17; fi
      ;;
    linux)
      for cmd in git curl unzip zip make cmake; do
        if ! command -v "$cmd" >/dev/null 2>&1; then missing_common=true; fi
      done
      if "$missing_common" && [[ ! -t 0 ]]; then
        note "System package installation needs an interactive terminal. Rerun --setup in your terminal."
        return 1
      fi
      if [[ -f /etc/fedora-release ]] && command -v dnf >/dev/null 2>&1; then
        # Prefer Fedora's native package manager even if apt-get is also installed.
        if "$missing_common"; then sudo dnf install git curl unzip zip gcc gcc-c++ make cmake; fi
        if ! node_is_supported; then sudo dnf install nodejs npm || true; fi
      elif command -v apt-get >/dev/null 2>&1; then
        if "$missing_common"; then
          sudo apt-get update
          sudo apt-get install git curl unzip zip build-essential cmake
        fi
        if ! node_is_supported; then sudo apt-get install nodejs npm || true; fi
        if ! jdk_home_for_17 >/dev/null; then sudo apt-get install openjdk-17-jdk || true; fi
      elif command -v dnf >/dev/null 2>&1; then
        # Some Fedora releases do not publish OpenJDK 17; setup downloads Temurin below.
        if "$missing_common"; then sudo dnf install git curl unzip zip gcc gcc-c++ make cmake; fi
        if ! node_is_supported; then sudo dnf install nodejs npm || true; fi
      else
        note "Automatic host-package installation supports apt, dnf, Homebrew, and Termux pkg."
        return 1
      fi
      ;;
  esac
}

install_temurin_17_linux() {
  local arch api_url jdk_url archive jdk_home
  if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1 || ! command -v sha256sum >/dev/null 2>&1; then
    note "curl, tar, and sha256sum are required for the Fedora Temurin fallback."
    return 1
  fi
  case "$(uname -m)" in x86_64) arch=x64 ;; aarch64|arm64) arch=aarch64 ;; *) note "Unsupported CPU architecture for Temurin auto-install."; return 1 ;; esac
  jdk_home="$HOME/.local/share/campus4change/toolchains/temurin-17"
  [[ ! -e "$jdk_home" ]] || { note "Refusing to replace existing JDK directory $jdk_home."; return 1; }
  api_url="https://api.adoptium.net/v3/binary/latest/17/ga/linux/$arch/jdk/hotspot/normal/eclipse"
  jdk_url="$(curl -fsS -o /dev/null -w '%{redirect_url}' "$api_url")"
  jdk_url="${jdk_url%%\?*}"
  [[ -n "$jdk_url" ]] || { note "Adoptium did not return a JDK download URL."; return 1; }
  archive="$(basename "$jdk_url")"
  temurin_temp_dir="${TMPDIR:-/tmp}/campus4change-temurin17-$$"
  mkdir -p "$temurin_temp_dir/extracted" "$(dirname -- "$jdk_home")"
  curl -fL "$jdk_url" -o "$temurin_temp_dir/$archive"
  curl -fsSL "${jdk_url}.sha256.txt" -o "$temurin_temp_dir/$archive.sha256.txt"
  (cd "$temurin_temp_dir" && sha256sum -c "$archive.sha256.txt")
  tar -xzf "$temurin_temp_dir/$archive" --strip-components=1 -C "$temurin_temp_dir/extracted"
  [[ -x "$temurin_temp_dir/extracted/bin/javac" ]] || { note "Temurin extraction did not produce javac."; return 1; }
  mv "$temurin_temp_dir/extracted" "$jdk_home"
  JAVA_HOME="$jdk_home"
  export JAVA_HOME
  pass "Installed checksum-verified Temurin JDK 17."
}

install_node24_linux() {
  local arch archive checksum_file node_root node_home
  if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1 || ! command -v sha256sum >/dev/null 2>&1; then
    note "curl, tar, and sha256sum are required for the Node.js fallback."
    return 1
  fi
  case "$(uname -m)" in x86_64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) note "Unsupported CPU architecture for Node.js auto-install."; return 1 ;; esac
  node_temp_dir="${TMPDIR:-/tmp}/campus4change-node24-$$"
  mkdir -p "$node_temp_dir/extracted" "$HOME/.local/share/campus4change/toolchains"
  checksum_file="$node_temp_dir/SHASUMS256.txt"
  curl -fsSL 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' -o "$checksum_file"
  archive="$(awk -v arch="linux-$arch" '$2 ~ /^node-v.*\.tar\.xz$/ && index($2, arch) {print $2; exit}' "$checksum_file")"
  [[ -n "$archive" ]] || { note "Could not find the Node.js 24 archive for linux-$arch."; return 1; }
  (cd "$node_temp_dir" && awk -v archive="$archive" '$2 == archive {print $0}' "$checksum_file" > selected.sha256)
  node_root="$node_temp_dir/extracted/${archive%.tar.xz}"
  curl -fL "https://nodejs.org/dist/latest-v24.x/$archive" -o "$node_temp_dir/$archive"
  (cd "$node_temp_dir" && sha256sum -c selected.sha256)
  tar -xJf "$node_temp_dir/$archive" -C "$node_temp_dir/extracted"
  [[ -x "$node_root/bin/node" && -x "$node_root/bin/npm" ]] || { note "Node.js extraction did not produce node and npm."; return 1; }
  node_home="$HOME/.local/share/campus4change/toolchains/${archive%.tar.xz}"
  [[ ! -e "$node_home" ]] || { note "Refusing to replace existing Node.js directory $node_home."; return 1; }
  mv "$node_root" "$node_home"
  node_bin_prefix="$node_home/bin"
  export PATH="$node_bin_prefix:$PATH"
  pass "Installed checksum-verified Node.js 24."
}

install_sdk_command_line_tools() {
  local archive expected_sha url source_dir destination actual_sha
  if [[ "$platform" == macos ]]; then
    case "$(uname -m)" in
      arm64) archive=commandlinetools-mac_arm64-15859902_latest.zip; expected_sha=835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e ;;
      x86_64) archive=commandlinetools-mac_x86_64-15859902_latest.zip; expected_sha=c5a6378ab5cf7e0d5701921405115befff13e9ff7417fb588389338f8bd050f3 ;;
      *) note "No Android command-line tools archive is listed for $(uname -m)."; return 1 ;;
    esac
  else
    archive=commandlinetools-linux-15859902_latest.zip
    expected_sha=4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583
  fi
  if ! command -v curl >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
    note "curl and unzip are required to install Android command-line tools."
    return 1
  fi
  sdktools_temp_dir="${TMPDIR:-/tmp}/campus4change-sdktools-$$"
  mkdir -p "$sdktools_temp_dir/extracted"
  url="https://dl.google.com/android/repository/$archive"
  curl -fL "$url" -o "$sdktools_temp_dir/$archive"
  if command -v sha256sum >/dev/null 2>&1; then
    actual_sha="$(sha256sum "$sdktools_temp_dir/$archive" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    actual_sha="$(shasum -a 256 "$sdktools_temp_dir/$archive" | awk '{print $1}')"
  else
    note "Install sha256sum or shasum to verify the Android command-line tools archive."
    return 1
  fi
  [[ "$actual_sha" == "$expected_sha" ]] || { note "Android command-line tools SHA-256 verification failed."; return 1; }
  unzip -q "$sdktools_temp_dir/$archive" -d "$sdktools_temp_dir/extracted"
  source_dir="$sdktools_temp_dir/extracted/cmdline-tools"
  [[ -x "$source_dir/bin/sdkmanager" ]] || { note "The command-line tools archive did not contain sdkmanager."; return 1; }
  destination="$sdk_root/cmdline-tools/latest"
  if [[ -e "$destination" ]]; then destination="$sdk_root/cmdline-tools/15859902"; fi
  [[ ! -e "$destination" ]] || { note "Refusing to replace existing command-line tools directory $destination."; return 1; }
  mkdir -p "$(dirname -- "$destination")"
  mv "$source_dir" "$destination"
  pass "Installed and checksum-verified Android SDK Command-line Tools 15859902."
}

write_local_properties() {
  local file="$repo_root/android/local.properties" temp_file escaped_sdk
  temp_file="${file}.tmp.$$"
  escaped_sdk="$(printf '%s' "$sdk_root" | sed 's/[\\ ]/\\&/g')"
  mkdir -p "$(dirname -- "$file")"
  if [[ -f "$file" ]]; then
    if "$termux"; then
      awk -F= '$1 != "sdk.dir" && $1 != "cmake.dir" && $1 != "ndk.dir" {print}' "$file" > "$temp_file"
    else
      awk -F= '$1 != "sdk.dir" {print}' "$file" > "$temp_file"
    fi
  else : > "$temp_file"; fi
  printf 'sdk.dir=%s\n' "$escaped_sdk" >> "$temp_file"
  if "$termux"; then printf 'cmake.dir=%s\nndk.dir=%s\n' "$PREFIX" "$HOME/termux-ndk-27.1.12297006" >> "$temp_file"; fi
  mv "$temp_file" "$file"
  pass "Created android/local.properties and preserved other local settings."
}

write_environment_file() {
  local path_prefix="$JAVA_HOME/bin:$sdk_root/platform-tools" node_prefix
  if [[ -n "$node_bin_prefix" ]]; then path_prefix="$node_bin_prefix:$path_prefix"; fi
  if [[ "$platform" == macos ]] && command -v brew >/dev/null 2>&1; then
    node_prefix="$(brew --prefix node@24 2>/dev/null || true)"
    if [[ -n "$node_prefix" && -x "$node_prefix/bin/node" ]]; then path_prefix="$node_prefix/bin:$path_prefix"; fi
  fi
  {
    printf 'export JAVA_HOME=%q\n' "$JAVA_HOME"
    printf 'export ANDROID_HOME=%q\n' "$sdk_root"
    printf 'export ANDROID_SDK_ROOT=%q\n' "$sdk_root"
    # Preserve a literal PATH expansion in the environment file for later sourcing.
    # shellcheck disable=SC2016
    printf 'export PATH=%q:"$PATH"\n' "$path_prefix"
    if "$termux"; then
      printf 'export LD_PRELOAD=%q\n' "${LD_PRELOAD:-$PREFIX/lib/libtermux-exec.so}"
      printf 'export TMPDIR=%q\n' "$TMPDIR"
    fi
  } > "$repo_root/.c4c-build-env.sh"
  pass "Created .c4c-build-env.sh for this repository."
}

setup_termux_ndk() {
  local source_ndk="$sdk_root/ndk/27.1.12297006" termux_ndk="$HOME/termux-ndk-27.1.12297006"
  if [[ -f "$termux_ndk/source.properties" ]] && grep -Fq 'Pkg.Revision = 27.1.12297006' "$termux_ndk/source.properties" && [[ -f "$termux_ndk/package.xml" ]]; then
    pass "Termux-compatible NDK already exists."
    return 0
  fi
  [[ ! -e "$termux_ndk" ]] || { note "Refusing to replace an incomplete NDK directory: $termux_ndk"; return 1; }
  sh "$repo_root/scripts/setup-termux-ndk.sh" "$source_ndk" "$termux_ndk"
}

if [[ "$mode" == "--check" ]]; then
  note "Checking prerequisites for $platform."
  check_requirements
  if (("${#missing[@]}" > 0)); then
    printf '\n%s prerequisite(s) are missing. Run with --setup to install supported packages and configure the SDK.\n' "${#missing[@]}"
    exit 1
  fi
  printf '\nPrerequisites are ready. Source ./.c4c-build-env.sh before building.\n'
  exit 0
fi

note "Installing supported prerequisites for $platform."
install_host_packages
if ! node_is_supported; then
  if [[ "$platform" == linux ]]; then
    install_node24_linux || exit 1
  else
    note "Install a Node.js version allowed by package.json engines, then rerun setup."
    exit 1
  fi
fi
if ! command -v npm >/dev/null 2>&1; then
  note "npm was not found after Node.js setup."
  exit 1
fi
if ! JAVA_HOME="$(jdk_home_for_17)"; then
  if [[ "$platform" == linux ]]; then install_temurin_17_linux || exit 1
  elif "$termux"; then
    JAVA_HOME="$PREFIX/lib/jvm/java-17-openjdk"
    [[ -x "$JAVA_HOME/bin/javac" ]] || { note "JDK 17 was not found at $JAVA_HOME."; exit 1; }
    export JAVA_HOME
  elif [[ "$platform" == macos ]]; then
    JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
    [[ -n "$JAVA_HOME" && -x "$JAVA_HOME/bin/javac" ]] || { note "Finish the Temurin 17 installer, then rerun setup."; exit 1; }
    export JAVA_HOME
  fi
else export JAVA_HOME; fi

if ! sdkmanager_path="$(find_sdkmanager)"; then install_sdk_command_line_tools || exit 1; fi
sdkmanager_path="$(find_sdkmanager)" || { note "Android SDK Manager is still unavailable after setup."; exit 1; }
mkdir -p "$sdk_root"
license_log_file="${TMPDIR:-/tmp}/campus4change-sdk-licenses-$$.log"
note "Checking SDK license status without accepting any license terms."
if check_sdk_license_status; then
  cat "$license_log_file"
else
  license_status=$?
  cat "$license_log_file"
  if (( license_status == 1 )); then
    note "Some Android SDK licenses remain unaccepted. Run sdkmanager --sdk_root=\"$sdk_root\" --licenses in an interactive terminal, review and accept them, then rerun setup."
  else
    note "SDK license status could not be checked with JDK 17. Review SDK Manager setup and rerun."
  fi
  exit 1
fi
"$sdkmanager_path" --sdk_root="$sdk_root" --install "platform-tools" "platforms;android-37.0" "build-tools;37.0.0" "ndk;27.1.12297006" "cmake;3.22.1"

if "$termux"; then setup_termux_ndk; fi
if [[ ! -f "$repo_root/node_modules/react-native/package.json" ]]; then
  (cd "$repo_root" && npm ci)
else pass "JavaScript dependencies already exist."; fi

if ! jdk_home_for_17 >/dev/null ||
  [[ ! -f "$sdk_root/platforms/android-37.0/android.jar" ]] ||
  [[ ! -f "$sdk_root/build-tools/37.0.0/aapt2" ]] ||
  [[ ! -f "$sdk_root/ndk/27.1.12297006/source.properties" ]]; then
  note "One or more prerequisites are still missing. Review the messages and rerun --check."
  exit 1
fi
write_local_properties
write_environment_file
printf '\nSetup is complete. Load the environment with: source ./.c4c-build-env.sh\n'
if "$termux"; then
  printf 'Then build from the repository root with: ./scripts/gradlew-termux.sh --no-daemon assembleDebug\n'
else
  printf 'Then build from android with: ./gradlew --no-daemon assembleDebug\n'
fi

