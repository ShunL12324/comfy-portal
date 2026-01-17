---
name: expo-dev
description: Start Expo development server in a tmux session. Use this when user wants to start, restart, or manage the Expo dev server. Triggers on commands like /expo, /expo-dev, /start, or when user mentions starting the dev server.
---

# Expo Development Server

Manage Expo development server in a dedicated tmux session.

## Usage

When this skill is triggered, execute the following steps:

### 1. Check and kill existing session

```bash
# Kill existing expo-dev session if it exists
tmux kill-session -t expo-dev 2>/dev/null || true
```

### 2. Start new tmux session with Expo

```bash
# Create new detached tmux session and start expo
cd /Users/shun/projects/comfy-portal && tmux new-session -d -s expo-dev 'npx expo start'
```

### 3. Wait and capture output

```bash
# Wait a moment for server to start, then show recent output
sleep 3
tmux capture-pane -t expo-dev -p | tail -30
```

### 4. Report to user

After executing, report:
- Session status (started/restarted)
- The QR code or local URL if visible in output
- How to view logs: `tmux attach -t expo-dev`

## Additional Commands

User may request these variations:

- **Stop server**: `tmux kill-session -t expo-dev`
- **View logs**: `tmux attach -t expo-dev` (note: this is interactive, use capture-pane instead)
- **Check status**: `tmux has-session -t expo-dev && echo "Running" || echo "Not running"`
- **Show recent logs**: `tmux capture-pane -t expo-dev -p | tail -50`

## Notes

- Devices must be on the same network as the development machine
- Session name is always `expo-dev`
