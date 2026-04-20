# Akhiyan Admin — Android App

Capacitor wrapper around the Next.js dashboard. The installed APK loads
`DASHBOARD_URL` in a WebView, so **every `git push` to the web app updates the
mobile UI instantly** without rebuilding the APK. Native rebuild is only
needed for push config, icons, splash, or new Capacitor plugins.

---

## Architecture

```
git push origin main
        │
        ├── Vercel / your host → redeploys the Next.js dashboard
        │   (web + installed Android app both see it on next load)
        │
        └── GitHub Actions (only when mobile/** changes) → builds APK
            → downloadable from the Actions tab
```

---

## One-time setup

### 1. Firebase project (for push notifications)

1. Go to https://console.firebase.google.com → **Create project** → name it e.g. `akhiyan-admin`.
2. Inside the project → **Add app** → Android icon.
   - Package name: **`com.akhiyan.admin`** (must match `capacitor.config.ts`).
   - Nickname: `Akhiyan Admin`.
   - SHA-1: leave blank for now (add later if you enable Google Sign-In).
3. Download `google-services.json` when prompted. You'll use it in two places.
4. In the same Firebase project → **Project Settings → Service accounts → Generate new private key**. You get a JSON file. Extract three values:
   - `project_id` → env var `FCM_PROJECT_ID`
   - `client_email` → env var `FCM_CLIENT_EMAIL`
   - `private_key` → env var `FCM_PRIVATE_KEY` (keep the `\n` escapes intact when pasting into `.env`)

### 2. Set env vars on your web host (Vercel / VPS)

```
FCM_PROJECT_ID=akhiyan-admin
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@akhiyan-admin.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Optional web-push (PWA) keys — generate with `npx web-push generate-vapid-keys`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>
VAPID_PUBLIC_KEY=<public>
VAPID_PRIVATE_KEY=<private>
VAPID_SUBJECT=mailto:admin@akhiyan.com
```

### 3. Run the Prisma migration

```bash
npx prisma migrate dev --name add_push_subscriptions
# or in prod:
npx prisma migrate deploy
```

### 4. Configure GitHub secrets (for CI builds)

Repo → **Settings → Secrets and variables → Actions** → add:

| Secret | Value |
| --- | --- |
| `GOOGLE_SERVICES_JSON` | paste the full contents of `google-services.json` |
| `DASHBOARD_URL`        | `https://your-deployed-dashboard-url.com` |

---

## Local build (optional — needed to run emulator / real phone tethered)

Requires Node 20+, JDK 21, Android Studio (or command-line tools + SDK).

```bash
cd mobile
npm install
npx cap add android          # first time only — generates android/ folder
# Place google-services.json at mobile/android/app/google-services.json
npx cap sync android         # after any config / plugin change
npx cap open android         # opens Android Studio → Run
```

Build an APK without Android Studio:

```bash
cd mobile/android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer the APK to your phone, tap to install (enable "Install unknown apps"
for your file manager once).

---

## CI build (no local setup)

Push any change under `mobile/` → GitHub Actions builds a debug APK.

- **Tab:** your repo → Actions → "Build Android APK"
- **Download:** click the latest run → Artifacts → `akhiyan-admin-debug-apk`
- **Install:** transfer APK to phone, tap to install.

---

## Testing push end-to-end

1. Install APK on your Android phone.
2. Open the app → sign in as admin → grant notification permission.
3. The device token is POSTed to `/api/v1/push/subscribe` and stored in
   `push_subscriptions` table.
4. On another device, place a test order via the storefront.
5. Your phone buzzes with `New Order — <name> — ৳<total>`. Tap → opens
   `/dashboard/orders/<id>`.

---

## Updating

### Just fixed a dashboard UI bug?
`git push` → Vercel deploys → open the installed app → bug fixed. **No APK rebuild needed.**

### Added a Capacitor plugin or changed `capacitor.config.ts`?
Edit `mobile/` → `git push` → Actions rebuilds APK → reinstall on phone.

### Changed app icon or name?
Edit `mobile/android/app/src/main/res/**` → `git push` → rebuild APK.

---

## Publishing to Play Store (later)

1. Generate a keystore (one-time, keep it safe):
   ```
   keytool -genkey -v -keystore akhiyan.keystore -alias akhiyan -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configure signing in `android/app/build.gradle`.
3. Build a signed release AAB:
   ```
   cd mobile/android && ./gradlew bundleRelease
   ```
4. Upload `app-release.aab` to Google Play Console ($25 one-time).

---

## Troubleshooting

- **Push not received**: check `FCM_*` env vars on server, check `google-services.json` matches the Firebase project, check the `push_subscriptions` row exists for your user.
- **App shows blank white screen**: `DASHBOARD_URL` unreachable — check `capacitor.config.ts` and device internet.
- **Gradle build fails on CI**: usually Android SDK licence — the workflow uses `setup-java@v4` which auto-accepts licences. If it still fails, add `yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses` step.
- **Order creation works but push silent**: look at server logs for `[push]` prefix. Missing FCM env vars log nothing and bail early — confirm they're set.
