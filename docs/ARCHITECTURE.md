# Campus4Change prototype architecture

This is a React Native CLI prototype, not an Expo app. The Android host launches a bundled React Native application. `index.js` registers `App.tsx`, which selects screens using local navigation state. The app code is organized by screen, shared UI, demo data, and theme.

```mermaid
flowchart LR
    Android["Android app shell"] --> RN["React Native + Hermes"]
    RN --> Entry["index.js: AppRegistry"]
    Entry --> App["App.tsx: navigation state and screen selection"]
    App --> State["Local state: page and logged"]
    App --> Screens["src/screens: screen views"]
    Screens --> Shared["src/components: header, buttons, tabs"]
    Screens --> Data["src/data: hard-coded demo content"]
    Screens --> Styles["src/theme: colors and StyleSheet"]
    State --> Screens
    Screens --> Actions["Button and tab taps"]
    Actions -->|"setPage / setLogged"| State
```

## Screen flow

```mermaid
flowchart LR
    Onboarding["Onboarding"] -->|"Get started"| Login["Login"]
    Login -->|"Sign in or create account"| Home["Home"]
    Home -->|"Find tutor / view matches"| Search["Tutor Search"]
    Search -->|"Select tutor"| Details["Tutor Details"]
    Details -->|"Book session"| Sessions["Sessions"]
    Details -->|"Message tutor"| Messages["Messages"]
    Home --> Tabs["Bottom tabs"]
    Tabs --> Search
    Tabs --> Sessions
    Tabs --> Messages
    Tabs --> Profile["Profile"]
```

## What this means

- Navigation is a typed `page` value in React state, not a navigation library or Android activity per screen. Tapping a button or tab calls `setPage`; signing in also sets `logged` to `true`.
- The login fields, tutor search, profiles, sessions, and messages are UI-only examples. No API, database, authentication service, or persistent storage is connected. Demo tutor and session values live in `src/data/demo.ts`.
- Shared UI is in `src/components/`; colors and styles are in `src/theme/`. The custom safe-area wrapper only adds Android status-bar top padding.
- `android/` is the native Android build project. The project also contains an iOS scaffold, but the prototype APK is built from Android. Android is configured for `arm64-v8a` with Hermes enabled.
- `__tests__/App.test.tsx` is a single render smoke test; it does not cover navigation or business behavior.

## Main files

| File | Role |
| --- | --- |
| `index.js` | Registers the root React Native component. |
| `App.tsx` | Local navigation state and screen selection. |
| `src/screens/` | Onboarding, login, home, tutor, and placeholder tab views. |
| `src/components/` | Shared button, header, tabs, and status-bar safe-area wrapper. |
| `src/data/demo.ts` | Static tutor, session, message, and profile values. |
| `src/theme/` | Shared colors and styles. |
| `src/types/navigation.ts` | Valid page names and navigation callback type. |
| `android/` | Native Android host and Gradle APK build. |
| `package.json` | React Native CLI dependencies and npm scripts. |
| `__tests__/App.test.tsx` | Root-component render test. |

This diagram describes the current prototype, not a proposed production architecture.
