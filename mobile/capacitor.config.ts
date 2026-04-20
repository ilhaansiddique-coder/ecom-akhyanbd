import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor Android shell for the Akhiyan admin dashboard.
 *
 * Architecture: "remote URL wrap" — the APK loads the live Next.js dashboard
 * inside a WebView. Every `git push` to the web app updates the mobile UI
 * instantly; the native shell only rebuilds when push config / icons / plugins
 * change.
 *
 * IMPORTANT: set `DASHBOARD_URL` below to your production HTTPS URL before
 * building a release APK. Android blocks cleartext HTTP by default.
 */
// Production dashboard URL. The app launches straight into /dashboard so admins
// land on the order list immediately; Next.js middleware redirects to login if
// the session is missing. Override per build via DASHBOARD_URL env var in CI.
const DASHBOARD_URL =
  process.env.DASHBOARD_URL || "https://akhiyanbd.com/dashboard";

const config: CapacitorConfig = {
  appId: "com.akhiyan.admin",
  appName: "Akhiyan Admin",
  webDir: "www",
  server: {
    url: DASHBOARD_URL,
    // Only set cleartext=true for local dev against http://10.0.2.2:3000 etc.
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0f5931",
      showSpinner: false,
    },
  },
};

export default config;
