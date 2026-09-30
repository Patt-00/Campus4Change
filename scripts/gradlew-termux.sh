#!/data/data/com.termux/files/usr/bin/sh
set -eu

# Keep Android-only Termux overrides out of the tracked Gradle configuration.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
android_dir="$script_dir/../android"
aapt2="/data/data/com.termux/files/usr/bin/aapt2"

if [ ! -x "$aapt2" ]; then
  echo "Termux aapt2 is missing: $aapt2" >&2
  exit 1
fi

exec "$android_dir/gradlew" \
  -p "$android_dir" \
  -PtermuxBuild=true \
  -Pandroid.aapt2FromMavenOverride="$aapt2" \
  -PreactNativeArchitectures=arm64-v8a \
  "$@"
