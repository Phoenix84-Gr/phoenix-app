# Put Phoenix on your phone

Phoenix is a web app that installs like a phone app (a PWA): its own icon on the home screen, full screen, no
browser bar. The app runs on a server you control (your computer or a host) and the phone opens it.

## Pick how the phone reaches the app

| Way | Good for | Install as an app? |
|---|---|---|
| **A. Same Wi-Fi as your computer** | Trying it today, nothing to sign up for | iPhone: yes. Android: a home-screen shortcut (full app install needs https) |
| **B. A host with https** (any Next.js host) | Using it anywhere | Yes, on both |
| **C. A private network you already use** (for example a mesh VPN that gives your computer an https name) | Using it anywhere without a public address | Yes, on both |

Phones install a web app fully only from an **https** address (or `localhost`). That is a browser rule, not a choice
of this project.

## A. Same Wi-Fi (about 5 minutes)

1. On the computer, in the project folder:
   ```bash
   npm ci
   npm run build
   npm start -- -H 0.0.0.0
   ```
   `-H 0.0.0.0` lets other devices on your network open it. Stop it with Ctrl+C when you are done.
2. Find the computer's local address: Windows `ipconfig` (IPv4 Address), macOS `ipconfig getifaddr en0`,
   Linux `hostname -I`. It looks like `192.168.1.23`.
3. On the phone (same Wi-Fi), open `http://192.168.1.23:3000` (your address).
4. Add it to the home screen (steps below).

Your computer's firewall may ask whether to allow Node.js on private networks: allow it for private networks only.

Plain `http` is not encrypted: keep this way for the offline assistant (the default). Do not type an access code for a
paid model over plain http; use way B or C for that.

## B. A host with https

1. Put your copy of the repository on your Git host and import it into a Next.js host of your choice.
2. In the host's settings, add the environment variables you need (see [SETUP.md](../SETUP.md)). With no variables,
   the assistant stays the offline mock and nothing costs money.
3. Deploy, open the https address on the phone, and add it to the home screen.

If you connect a paid model, **set `ASSISTANT_ACCESS_CODE`**: the demo has no login, so the code is what stops
strangers who find the address from using your key. The app refuses to start a real provider without it.

## C. A private network

If you already run a private network that gives your computer an https name, serve port 3000 through it and open
that name on the phone. Only devices in your network can reach the app.

## Add to the home screen

**iPhone (Safari):** open the address → tap **Share** (the square with an arrow) → **Add to Home Screen** → **Add**.

**Android (Chrome):** open the address → tap **⋮** → **Install app** (on https) or **Add to Home screen** → **Install**
/ **Add**.

Open it from the new icon: it starts full screen with the Phoenix orb.

## Good to know

- The app needs to reach its server; it does not work offline. It keeps no offline cache, and the access code you
  type in the chat stays in memory only, so the app stores nothing on the phone except the theme choice (a cookie).
- Remove it like any app: long-press the icon → Remove.
- Change the name and icon first if you like: ask the setup agent to "retheme" it.
