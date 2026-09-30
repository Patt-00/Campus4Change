#!/data/data/com.termux/files/usr/bin/sh

# React Native currently distributes its Linux Hermes compiler for x86_64.
# QEMU lets the ARM64 Termux build host invoke the statically linked binary.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec /data/data/com.termux/files/usr/bin/qemu-x86_64 \
  "$script_dir/../node_modules/hermes-compiler/hermesc/linux64-bin/hermesc" "$@"
