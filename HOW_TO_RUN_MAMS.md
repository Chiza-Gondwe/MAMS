# How to Start and Run the MAMS System

Follow these steps to run the complete **MAMS** ecosystem (**Django Backend**, **React Web Dashboard**, and **Flutter Mobile App** — either **Wirelessly** or via **USB**).

---

## Step 1: Start the Django Backend (The Brain)

You can start the backend in **either** of two ways:

### Option 1A — One-Click Launcher (Recommended)
Double-click **`start_django_wifi.bat`** in your `MAMS` folder.
- It automatically detects and prints your laptop's current Wi-Fi / Hotspot IP address (e.g., `http://172.16.50.68:8000/api`) and starts Django on `0.0.0.0:8000`.

### Option 1B — Terminal Command
Open a terminal in your `MAMS` folder and run:

```powershell
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

> **Important:** Always use `0.0.0.0:8000` (instead of just `runserver`) so your phone can reach your laptop wirelessly over Wi-Fi or Mobile Hotspot! Leave this terminal window open.

---

## Step 2: Start the React Web Dashboard (The Admin Portal)

Open a **new** terminal in your `MAMS\frontend` folder and run:

```powershell
npm run dev
```

_(Leave this terminal window open. Access the Web Dashboard in your browser at `http://localhost:3000` or `http://localhost:5173`)._

---

## Step 3: Run the Mobile App (3 Connection Modes)

The standalone app installer is located at **`MAMS\MAMS_Mobile_Release.apk`**. Once installed on your phone, you can connect it to your laptop using any of the 3 modes below:

### Mode A: Wireless via Same Wi-Fi or Phone Hotspot (Recommended — No USB Cable!)
1. Connect your laptop and phone to the **same Wi-Fi network** (or turn on your **phone's Mobile Hotspot** and connect your laptop to it).
2. Make sure Django is running on `0.0.0.0:8000` (**Step 1**).
3. Find your laptop's IPv4 address:
   - It is printed automatically at the top of **`start_django_wifi.bat`**, OR
   - Run `ipconfig` in PowerShell and look under **Wireless LAN adapter Wi-Fi $\rightarrow$ IPv4 Address** (for example: `172.16.50.68`).
4. Open the **MAMS** app on your phone:
   - **On the Login Screen:** Tap the **Server icon** (top-right corner).
   - **Or if already logged in:** Go to **Profile** $\rightarrow$ **Server Connection (USB / Wireless Tunnel)**.
   - Tap the **`Wi-Fi (172.16.50.68)`** preset (or type `http://<YOUR_LAPTOP_IP>:8000/api` if your IP changed on a new hotspot) and tap **Save / Apply**.

---

### Mode B: Wireless over 4G/5G Mobile Data Anywhere (Cloudflare Tunnel)
Use this mode if your phone is on mobile data (`4G/5G`) and **not** on the same Wi-Fi/Hotspot as your laptop:
1. Keep Django running (**Step 1**).
2. Double-click **`start_wireless_tunnel.bat`** in your `MAMS` folder.
3. Copy the `https://....trycloudflare.com` link shown in the terminal box.
4. Paste that link into the MAMS app's **Server Address / Server Connection** setting and tap **Save / Apply**.

---

### Mode C: USB Cable Mode (For Live Flutter Code Editing & Hot Reload)
Use this mode when you are actively editing Flutter code in VS Code and want `r` (Hot Reload):
1. Plug your Android phone into your laptop via USB (screen unlocked).
2. Open a terminal in `MAMS` and forward port `8000`:
   ```cmd
   "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
   ```
3. In the MAMS app's **Server Connection** setting, tap the **`USB (127.0.0.1)`** preset (`http://127.0.0.1:8000/api`).
4. To launch in debug mode with Hot Reload, open a terminal in `MAMS\mams_mobile` and run:
   ```powershell
   flutter run
   ```
   - Press **`r`** for Hot Reload or **`R`** for Hot Restart.

---

## Step 4: How to Rebuild the Standalone `.apk` After Code Changes

Whenever you make changes to the Flutter code in `MAMS\mams_mobile` and want to update **`MAMS_Mobile_Release.apk`**, run:

```powershell
cd c:\Users\gondw\Downloads\MAMS\mams_mobile
flutter build apk --release
Copy-Item "build\app\outputs\flutter-apk\app-release.apk" -Destination "..\MAMS_Mobile_Release.apk" -Force
```

---

## Quick Reference Summary

| What You Are Using | How to Start Django | Server URL to Set in the MAMS App |
| :--- | :--- | :--- |
| **Same Wi-Fi / Phone Hotspot (No USB)** | `start_django_wifi.bat` *(or `runserver 0.0.0.0:8000`)* | `http://172.16.50.68:8000/api` *(or current `ipconfig` IPv4)* |
| **4G/5G Mobile Data (`start_wireless_tunnel.bat`)** | `runserver 0.0.0.0:8000` + `start_wireless_tunnel.bat` | `https://xxxx.trycloudflare.com/api` |
| **USB Cable (`adb reverse`)** | `runserver 0.0.0.0:8000` + `adb reverse tcp:8000 tcp:8000` | `http://127.0.0.1:8000/api` |

---

## Troubleshooting

- **"Unable to connect to backend server" when using Wi-Fi / Hotspot?**
  1. Check that Django was started with **`0.0.0.0:8000`** (not `127.0.0.1:8000`).
  2. Run `ipconfig` on your laptop to check if your Wi-Fi IPv4 address changed (switching from home Wi-Fi to a phone hotspot assigns a new IP like `192.168.43.x` or `172.20.10.x`). Update the IP in the app's **Server Connection** setting.
- **Want to switch between Light Mode, Dark Mode, and System Default?**
  Tap the **Sun/Moon icon** in the top-right header of the Home Screen, or open **Profile & Settings** $\rightarrow$ **Appearance Mode**.
