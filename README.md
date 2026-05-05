# Kind Reminders

A friendly, local-first reminder app for phone or computer. It runs in a browser, saves reminders on the device with local storage, and can be installed as a Progressive Web App.

## Current App

- Voice input using the browser speech recognition API.
- Optional AI cleanup for spoken reminders.
- Translation support.
- Date folders and colour-coded reminders.
- Local device saving.
- Browser notifications while the app is open.
- Offline support after the first load.
- Installable as a Progressive Web App.

## Use It Locally

Open this while the local server is running:

```text
http://127.0.0.1:4173
```

To start the preview server later:

```powershell
& "C:\Users\samfo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
```

## Put It Online With GitHub Pages

1. Open `https://github.com/sfox2006/reminderapp/settings/pages`.
2. Under **Source**, choose **GitHub Actions**.
3. Save the setting.
4. Push to the `main` branch.
5. Wait for the **Deploy to GitHub Pages** action to finish.
6. Open `https://sfox2006.github.io/reminderapp/` on your phone.
7. On iPhone Safari, tap **Share** and then **Add to Home Screen**.

The workflow file is already included at `.github/workflows/deploy.yml`.

## Optional AI Cleanup

The app works without an AI API key. If you do nothing, the **Clean up words** button uses a small free local cleanup that removes common filler words.

For smarter cleanup:

1. Get a Claude API key from Anthropic.
2. Open **Settings** in the app.
3. Paste the key into **Claude API key**.
4. Turn on automatic cleanup if you want voice notes cleaned after recording.
5. Save settings.

Important: Claude API usage may cost money on your Anthropic account. The key is stored only in this browser using localStorage, which is acceptable for a personal app but not suitable for a public multi-user app.

## Later Phases

Cross-device sync needs a backend. The recommended free-tier option is Supabase with email magic-link login. Google Calendar sync also needs Google Cloud OAuth setup. Those are not enabled yet because they require accounts, project URLs, and keys that only you can create.

## Notes

Voice recognition works best in Chrome or Edge. iPhone Safari support for live speech recognition and install prompts can vary, but the app still works as a normal browser app.

Reminders currently save separately on each device until Supabase sync is added.
