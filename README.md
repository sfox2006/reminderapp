# Kind Reminders

A friendly, local-first reminder app for phone or computer. It runs in a browser, saves reminders on the device with local storage, and can be installed as a Progressive Web App.

## Use It

Open:

```text
http://127.0.0.1:4173
```

To start the preview server later:

```powershell
& "C:\Users\samfo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
```

## Features

- Friendlier mobile-first interface.
- Voice input using the browser speech recognition API.
- Translation using the browser Translator API when available, with a free web fallback.
- Date folders generated automatically from reminder dates.
- Colour-coded reminders.
- Local browser notifications while the app is open.
- Offline support after the first load.
- Install button support on browsers that allow PWAs.

## Notes

Voice recognition works best in Chrome or Edge. iPhone Safari support for live speech recognition and install prompts can vary, but the app still works as a normal browser app.
