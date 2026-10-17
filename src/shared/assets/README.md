# Bundled assets

The welcome screen uses the complete `campus4change-logo.png` lockup, including the education mark and wordmark, as a bundled image. Outline SVG files are source artwork for the matching PNGs used by React Native.

Android launcher artwork is maintained as vector source in `android/branding/`. The adaptive icon uses a transparent foreground and the Campus4Change navy background; density-sized PNGs provide the legacy launcher icon on older Android versions.

Inter was downloaded from the [Google Fonts Inter directory](https://github.com/google/fonts/tree/main/ofl/inter). Android bundles static Regular, Medium, SemiBold, and Bold instances in `android/app/src/main/assets/fonts/`. The font license is included as `Inter-OFL.txt`.

No runtime image or font download is required.
