# Campus4Change browser prototype

JavaScript React + Vite implementation of the splash, Novice / Intermediate / Expert introductions, and sample Login / Sign Up screens. This is the browser prototype for the React milestone, not the native Android application.

## Run and verify

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run lint
npm run build
```

The splash advances after three seconds. Back, Next, slide indicators, Skip and Get started navigate the introduction and forms. Hash routes support direct links, refresh and browser Back without a server routing configuration.

| Route | Screen |
| --- | --- |
| `#/splash` | Splash with Campus4Change logo |
| `#/intro/1` | Novice introduction |
| `#/intro/2` | Intermediate introduction |
| `#/intro/3` | Expert introduction |
| `#/login` | Sample sign-in form |
| `#/signup` | Sample registration form |

The forms validate required fields and email format, and registration requires an eight-character password. They do not authenticate, create accounts, or store credentials. Use sample details only. Native account storage and biometric sign-in are outside this prototype.

## Component structure

```text
App (route and splash timer)
└── PhoneScreenLayout (responsive, scrollable frame)
    ├── SplashScreen
    ├── IntroSlideshow
    │   ├── IntroSlide (content from data/slides.js)
    │   ├── PageDots
    │   └── PrimaryButton
    └── AuthScreen (login/signup variants)
        └── PrimaryButton
```

`src/hooks/useRoute.js` manages hash navigation. `src/index.css` defines shared colors, local Inter fonts, focus styles and reduced-motion support. Screen CSS stays beside each component. The logo and slide images are under `src/assets/`; the Inter font license is included there.

The phone frame scrolls when content exceeds a short screen. Buttons have at least 44px interaction targets; labels, keyboard focus, status announcements and image alternatives are provided. Logo imagery includes the wordmark, so the splash does not duplicate it visually.

## Submission notes

Include original high-fidelity prototype screenshots immediately followed by the matching browser screenshots, explain reusable components and routing, and show relevant source code. Verify exact visual fidelity against the finalized group prototype before submission; these improvements are not a claim of an exact Figma match.

AI assistance: OpenAI Codex helped integrate the generated Campus4Change logo, refine responsive layouts, add hash navigation and sample authentication forms, and verify lint/build. An OpenAI image-generation tool produced the logo. Group members should review and explain these changes and accurately document their own contributions. This README is not a substitute for the required report.
