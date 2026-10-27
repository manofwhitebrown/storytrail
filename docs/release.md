# Release build (signed AAB for Google Play)

## One time
1. Make a keystore (keep it somewhere safe, and back it up; if you lose it you cannot update the app):
   ```bash
   keytool -genkeypair -v -keystore storytrail-release.jks -alias storytrail -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Turn it into text: `base64 -w0 storytrail-release.jks` (Mac: `base64 -i storytrail-release.jks`).
3. GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret. Add four:
   `KEYSTORE_BASE64` (the text from step 2), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (storytrail), `KEY_PASSWORD`.
4. Never commit the `.jks` file or the passwords (`.gitignore` already skips `*.jks`).

## Every release
1. Raise `versionCode` (a whole number, +1 each upload) and `versionName` in `android/app/build.gradle`, and `version` in `package.json`.
2. Actions tab -> "Release AAB" -> Run workflow (or push a tag like `v0.3.0`).
3. Download `storytrail-release-aab` from the run; upload `app-release.aab` in Play Console (Production or Internal testing).

## Play Console checklist
Developer account (one-time fee), app name, short and full description, icon 512x512, feature graphic 1024x500, at least 2 phone screenshots, content rating questionnaire, Data safety form (see `docs/privacy.md`), privacy policy URL (publish `docs/privacy.md` and `docs/social.md` as a page, for example on GitHub Pages), target audience.

## Camp links opening the app
The manifest lets `https://manofwhitebrown.github.io/storytrail/...` open the app, but Android only asks "open with" because the link is not verified. Verified links need a `.well-known/assetlinks.json` on the root of the website, which a github.io project page cannot provide. A custom domain would fix that.
