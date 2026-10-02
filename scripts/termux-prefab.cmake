# Termux's native compiler reports an architecture suffix different from the
# one Android Gradle Plugin uses when extracting Prefab packages. Include the
# extracted package-config directory in CMake's search path for Termux builds.
if(CMAKE_FIND_ROOT_PATH)
  list(GET CMAKE_FIND_ROOT_PATH 0 _termux_prefab_root)
  set(_termux_prefab_cmake
    "${_termux_prefab_root}/lib/aarch64-linux-android/cmake")
  foreach(_termux_package ReactAndroid fbjni hermes-engine)
    set("${_termux_package}_DIR"
      "${_termux_prefab_cmake}/${_termux_package}")
  endforeach()
endif()
