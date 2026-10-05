# Color Shift (React Native)

An iPhone app built with React Native and Expo, adapted from Matt D. Smith's [Color Shift](https://labs.shiftnudge.com/color-shift) and built from the Figma "iOS exploration" design. The browser prototype it was ported from lives in [`color-shift/prototype`](https://github.com/fernandezcarolina/color-shift/tree/main/prototype).

- Top: the contrast score (WCAG or APCA) in a Liquid Glass pill, plus swap (⇄) and more (⋯).
- Middle: your text color ("Aa") on your background color, fading into an Unsplash photo.
- Bottom: share, previous/next photo (‹ ›), and add (+).
- ⋯ → Foreground or Background opens the **Edit sheet** with OKLCH / HSB / RGB sliders.

Real Liquid Glass and SF Symbols appear on iOS 26 or later. Elsewhere you see a soft translucent stand-in.

## Run it

Open a terminal in this folder and start Expo:

```
npx expo start
```

- **On your iPhone:** install **Expo Go** from the App Store, connect the phone to the same Wi‑Fi as your Mac, and scan the QR code shown in the terminal with the iPhone camera.
- **In the iPhone simulator:** press `i` in the terminal.
- **In a browser:** press `w`.

Press `Control-C` to stop.

## Where things are

| File | What it does |
|---|---|
| `App.tsx` | The screen: color and photo halves, glass controls, menus, sheet |
| `src/color.ts` | Color math: OKLCH/HSB/RGB, WCAG and APCA, jump to a contrast level |
| `src/photos.ts` | Loads photos from the Vercel function (the Unsplash key stays on the server) |
| `src/components/` | Glass surface and buttons, menus, the Edit sheet and sliders |

## Checks

```
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
