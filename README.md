# KingFish Mobile

Expo app shell for KingFish Bets.

## First Local Setup

When npm can reach the registry, run:

```bash
cd mobile
npm install
npm run start
```

Then choose:

- `i` for iPhone Simulator, if Xcode is installed
- `a` for Android Emulator, if Android Studio is installed
- scan the QR code with Expo Go for a physical-device preview

## Environment

Copy `.env.example` to `.env` and fill in only public mobile-safe values:

```bash
cp .env.example .env
```

Never put server-only keys in the mobile app.

## npm Cache Permission Fix

If npm says your cache has root-owned files, run the command npm suggests:

```bash
sudo chown -R 501:20 "/Users/briandelancey/.npm"
```

Then run:

```bash
npm install
npm run start
```
