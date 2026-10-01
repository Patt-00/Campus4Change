# Verification for 1.1.0

Verified on Windows on 2026-10-01. The release is an offline school prototype preview.

## Results

| Check | Result |
| --- | --- |
| TypeScript: `npx tsc --noEmit` | Passed |
| ESLint: `npm run lint` | Passed without warnings |
| Jest: `npm test -- --runInBand` | 16 tests passed in 2 suites |
| Native release: `gradlew.bat -p android assembleRelease` | Passed |
| Release Metro/Hermes bundling | Passed as part of the native build |
| APK signature | Verified, APK Signature Scheme v2 |
| APK package/version | `com.campus4change`, 1.1.0, version code 2 |
| Minimum/target Android SDK | 24 / 36 |
| APK ABIs | ARM64, ARMv7, x86, x86_64 |
| Local fonts and Hermes libraries | Present for the packaged build |
| Old v1.0.0 certificate comparison | Same certificate as 1.1.0 |
| Termux rebuild | Not performed; existing scripts retained |
| Installation and upgrade | Not verified |
| Cold launch and visible interactions | Not verified |
| Android native storage and biometric runtime | Not verified on a device |
| Pixel comparison with Figma | Not verified on a device |

The Windows emulator did not boot. It remained offline. The host's emulator check reported that the Android Emulator hypervisor driver is not installed. Software CPU/rendering attempts also failed to boot. No physical device was connected for testing. The test emulator was stopped after these attempts.

The APK includes the JavaScript bundle as Hermes bytecode, Inter fonts, and `libhermestooling.so` and `libhermesvm.so` for all four ABIs. Packaging these libraries does not prove a successful cold launch.

Jest mocks the native storage interface. Passing tests proves the tested React flows and reducer rules, not Android encryption or biometric behavior.

## Artifact identity

Release filename: `Campus4Change-v1.1.0.apk`

Size: 54,727,872 bytes.

SHA-256:

```text
e2259faa96cfa02ad95d605954cc50a827f3b62dcc069198bef44075e85e3270
```

Signing certificate SHA-256:

```text
fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
```

The previous GitHub v1.0.0 APK has the same package ID and certificate and version code 1. An actual update installation has not been tested.

The release attaches a checksum file and source/build record. Its tag points to the source commit containing the app and these guides. Machine-specific SDK files, downloaded tools, build outputs, and inspection artifacts remain ignored.

## Teacher walkthrough

This is the intended walkthrough after the APK passes a device smoke test. It is not a record of completed device testing.

1. Open onboarding, go to login, and demonstrate invalid form input.
2. Use **USE DEMO ACCOUNT** to load public sample content. Explain that the data is local.
3. Search for Mika, open her selected profile, and book a future session. Open the saved session details.
4. Show upcoming, completed, and cancelled views. Reschedule or cancel a booking.
5. Join a discovered group or create a new group. Publish a study note and reply.
6. Open a study room, run/pause its timer, write notes, and leave. Reopen to show saved notes.
7. Open a conversation and save a message. Explain that it is not delivered to another person.
8. Open notifications and show that an opened notice becomes read.
9. Edit the profile and learning interests, then sign out.
10. Sign in again to show saved data. Create another account to show separate personal data.

Do not present sample contacts as live users. Do not demonstrate email recovery, push notifications, calls, or remote messaging as implemented. Install and launch the exact tagged APK before the teacher demonstration.
