# Verification for 1.1.0

Verified on Windows and one connected Android 16 phone on 2026-10-01. The release is an offline school prototype preview. Device testing stopped at the user's request after the checks below.

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
| Installation and upgrade | Passed: updated the installed v1.0 APK on Android 16 |
| Cold launch | Passed: app process stayed running and onboarding rendered |
| Visible device interactions | Passed: empty-login validation, demo login, tutor search, selected Mika profile, past-time rejection, future Physics booking, confirmation and session details |
| Native account/storage path | Demo password login and booking flow exercised; persistence after restart not tested on the phone |
| Android biometric runtime | Not tested on the phone |
| Pixel comparison with Figma | Not verified on a device |

The Windows emulator did not boot. It remained offline. The host's emulator check reported that the Android Emulator hypervisor driver is not installed. Software CPU/rendering attempts also failed to boot. The test emulator was stopped. A physical Android 16 phone was then connected and used for the successful checks above.

Onboarding, home, booking, and selected session details were inspected on the phone. No app crash was observed during these checks. Messages, groups, study rooms, account creation, profile editing, saved data after restart, and biometrics remain pending physical-device tests. Their tested React/state behavior is covered separately by Jest.

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

The previous GitHub v1.0.0 APK has the same package ID and certificate and version code 1. An update over the phone's installed v1.0 APK succeeded without uninstalling.

The release attaches checksums, the original source/build record, and a later device-verification record. Its tag points to app source commit `bbe235aff0b45e7a7f429841fb79dcb725134161`. Device verification was recorded afterward in a documentation-only commit; the APK and application code were not changed. Machine-specific tools, build outputs, and phone screenshots remain ignored.

## Teacher walkthrough

This is the full intended walkthrough. Only the device checks listed above were completed; the rest remain for manual testing before the teacher demonstration.

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
