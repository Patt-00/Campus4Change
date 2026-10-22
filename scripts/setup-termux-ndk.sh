#!/data/data/com.termux/files/usr/bin/sh

set -eu

if [ -z "${PREFIX:-}" ]; then
    printf '%s\n' 'Run this script from the Termux app.' >&2
    exit 1
fi

source_ndk=${1:-"$HOME/android-sdk/ndk/27.1.12297006"}
termux_ndk=${2:-"$HOME/termux-ndk-27.1.12297006"}
android_api=24

case "$source_ndk" in
    /*) ;;
    *) source_ndk="$PWD/$source_ndk" ;;
esac
case "$termux_ndk" in
    /*) ;;
    *) termux_ndk="$PWD/$termux_ndk" ;;
esac

if [ "$source_ndk" = "$termux_ndk" ]; then
    printf '%s\n' 'Use a separate output path for the Termux-compatible NDK.' >&2
    exit 1
fi

for required_path in \
    "$source_ndk/source.properties" \
    "$source_ndk/package.xml" \
    "$source_ndk/meta" \
    "$source_ndk/build/cmake/android.toolchain.cmake" \
    "$PREFIX/bin/clang" \
    "$PREFIX/bin/clang++" \
    "$PREFIX/aarch64-linux-android/lib/libc++_shared.so"; do
    if [ ! -e "$required_path" ]; then
        printf 'Required path not found: %s\n' "$required_path" >&2
        exit 1
    fi
done

clang_resource_dir=$("$PREFIX/bin/clang" --print-resource-dir)
clang_version=${clang_resource_dir##*/}
if [ ! -f "$clang_resource_dir/lib/linux/libclang_rt.builtins-aarch64-android.a" ]; then
    printf 'ARM64 Clang runtime is missing from: %s\n' "$clang_resource_dir" >&2
    exit 1
fi

mkdir -p "$termux_ndk"
cp -a \
    "$source_ndk/build" \
    "$source_ndk/meta" \
    "$source_ndk/source.properties" \
    "$source_ndk/package.xml" \
    "$termux_ndk/"

prebuilt="$termux_ndk/toolchains/llvm/prebuilt"
runtime="$prebuilt/lib/clang/$clang_version"
mkdir -p \
    "$prebuilt/sysroot/usr/lib/aarch64-linux-android" \
    "$prebuilt/linux-x86_64" \
    "$runtime/lib/aarch64-none-linux-android$android_api"

ensure_link() {
    link_source=$1
    link_target=$2

    if [ -L "$link_target" ]; then
        existing_target=$(readlink "$link_target")
        if [ "$existing_target" = "$link_source" ]; then
            return
        fi
        printf 'Refusing to replace existing symlink: %s\n' "$link_target" >&2
        return 1
    fi
    if [ -e "$link_target" ]; then
        printf 'Refusing to replace existing path: %s\n' "$link_target" >&2
        return 1
    fi
    ln -s "$link_source" "$link_target"
}

# CMake running inside Termux identifies the host as Android and asks for
# prebuilt/bin. AGP's symbol-strip task separately asks for linux-x86_64/bin.
ensure_link "$PREFIX/bin" "$prebuilt/bin"
ensure_link "$PREFIX/bin" "$prebuilt/linux-x86_64/bin"
ensure_link "$prebuilt/sysroot" "$prebuilt/linux-x86_64/sysroot"
ensure_link "$prebuilt/lib" "$prebuilt/linux-x86_64/lib"

# Reuse Termux's Android headers and ARM64 NDK libraries for the app's API 24
# minimum. Keep these aliases inside the private compatibility NDK directory.
ensure_link "$PREFIX/include" "$prebuilt/sysroot/usr/include"
ensure_link \
    "$PREFIX/aarch64-linux-android/lib" \
    "$prebuilt/sysroot/usr/lib/aarch64-linux-android/$android_api"
ensure_link \
    "$PREFIX/aarch64-linux-android/lib/libc++_shared.so" \
    "$prebuilt/sysroot/usr/lib/aarch64-linux-android/libc++_shared.so"

# NDK CMake expects the compiler runtime in a target-specific directory.
ensure_link "$clang_resource_dir/include" "$runtime/include"
ensure_link "$clang_resource_dir/lib/linux" "$runtime/lib/linux"
ensure_link "$clang_resource_dir/share" "$runtime/share"
ensure_link \
    "$clang_resource_dir/lib/linux/libclang_rt.builtins-aarch64-android.a" \
    "$runtime/lib/aarch64-none-linux-android$android_api/libclang_rt.builtins.a"

printf 'Termux-compatible NDK prepared at %s\n' "$termux_ndk"
printf 'Set ndk.dir=%s in android/local.properties\n' "$termux_ndk"
