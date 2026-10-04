# MAMS — Complete Copy-Paste Reference Guide (Online & Offline)

Keep this file open whenever you need your links, login details, or update commands — **you never have to memorize anything**, just copy and paste from below!

---

## 1. Your Live Website & Mobile App Links (Works 24/7 Anywhere)

| What You Need | Copy-Paste Link |
| :--- | :--- |
| **Live Web Dashboard (Login Page)** | `https://mamszambia.pythonanywhere.com` |
| **Direct Mobile App Download Link (.apk)** | `https://mamszambia.pythonanywhere.com/api/download-app/` |
| **Mobile App File on Your Laptop** | `c:\Users\gondw\Downloads\MAMS\MAMS_Mobile_Release.apk` |
| **PythonAnywhere Control Panel** | `https://www.pythonanywhere.com/user/mamszambia/` |

> **Remember:** Your laptop can be **completely turned off** and both the website (`https://mamszambia.pythonanywhere.com`) and the mobile app will continue working 24/7 on Wi-Fi or 4G/5G mobile data!

---

## 2. Your Ready-to-Use Login Accounts

| Account Role | Username / Email | Password | Organization Code |
| :--- | :--- | :--- | :--- |
| **System Superadmin** | `admin@example.com` | `password123` | *(All Organizations)* |
| **UCZ Trinity Admin (Chiza Gondwe)** | `gondwechiza28@gmail.com` | `password123` | `LUS-C-86EC94` |

---

## 3. How to Share / Pass the Mobile App to Other People (No USB Cable Needed!)

You have **2 easy ways** to give the MAMS mobile app to your partner, church members, or supervisor:

### Method A — Download Directly from Your Live Website (Easiest)
1. Tell the person to open **`https://mamszambia.pythonanywhere.com`** on their Android phone.
2. At the bottom of the Login box, tap **`📲 Download Android Mobile App (.apk)`** (or send them the direct link: `https://mamszambia.pythonanywhere.com/api/download-app/`).
3. Tap **Open / Install** when the download finishes.

### Method B — Send the `.apk` File Directly on WhatsApp / Telegram
1. On your laptop, open **`c:\Users\gondw\Downloads\MAMS`**.
2. Drag and drop **`MAMS_Mobile_Release.apk`** into a WhatsApp chat, Telegram, or Google Drive.
3. Anyone who receives it on their Android phone simply taps it to install!

---

## 4. How Changes Apply When Your Phone Is NOT Connected to a USB Cable

- **99% of Daily Changes (Automatic — No Cable, No Reinstall):**
  - Adding/approaching members, posting announcements, recording attendance, pinning map locations, sending group chat messages, or recording contributions all save to the cloud (`https://mamszambia.pythonanywhere.com/api`).
  - Everyone's phone updates **automatically over the internet** (just pull down to refresh).
- **If We Edit Website Code (`frontend` or Django Backend):**
  1. Push from your laptop PowerShell (`c:\Users\gondw\Downloads\MAMS`):
     ```powershell
     cd c:\Users\gondw\Downloads\MAMS\frontend; npm.cmd run build; cd ..; git add -A; git commit -m "Update MAMS"; git push origin master
     ```
  2. Paste this 1-line command into your **PythonAnywhere Bash console**:
     ```bash
     cd ~/MAMS && git pull && touch /var/www/mamszambia_pythonanywhere_com_wsgi.py
     ```
- **If We Edit Mobile App Design/Flutter Code (`mams_mobile`) Without a USB Cable:**
  1. Rebuild the `.apk` on your laptop:
     ```powershell
     cd c:\Users\gondw\Downloads\MAMS\mams_mobile
     C:\Users\gondw\Downloads\flutter_windows_3.44.2-stable\flutter\bin\flutter.bat build apk --release --target-platform android-arm,android-arm64
     Copy-Item -Force build\app\outputs\flutter-apk\app-release.apk ..\MAMS_Mobile_Release.apk
     ```
  2. Push it to GitHub & PythonAnywhere (or send `MAMS_Mobile_Release.apk` on WhatsApp) and tap it on your phone to update in 5 seconds — **no USB cable needed!**

---

## 5. How Online + Offline Mode Works on the Mobile App

The MAMS mobile app is a **Hybrid Online + Offline Application**:
1. **When Online (Mobile Data or Wi-Fi):**
   - Fetches live data from `https://mamszambia.pythonanywhere.com/api` and automatically saves an encrypted local copy on your phone.
2. **When Offline (Zero Data / Airplane Mode):**
   - **Offline Sign-In & Biometrics:** You can still sign in using your saved password or fingerprint/face unlock even when you have no mobile data.
   - **Offline Viewing:** Your Digital Member ID Card & Personal QR Code, Member Directory, Member Map locations, Announcements, Financial Contributions history, and Group Chat history remain accessible offline.
   - **Offline Attendance Scanning:** If an usher or member scans a QR code when mobile data is down, the app saves the scan into the **Offline Attendance Queue** on the phone and **automatically syncs** it to the cloud as soon as internet returns!
