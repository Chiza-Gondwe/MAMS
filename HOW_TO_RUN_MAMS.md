# How to Start the MAMS System (Local Development)

Whenever you restart your computer or unplug your phone, you need to follow these 4 steps in order to get the entire system (Backend, Web, and Mobile) running properly.

---

### Step 1: Start the Django Backend (The Brain)

Open a terminal in your `MAMS` folder and run:

```cmd
venv\Scripts\activate
python manage.py runserver
```

_(Leave this terminal window open and running)_

### Step 2: Start the React Web Dashboard (The Admin Portal)

Open a **new** terminal in your `MAMS\frontend` folder and run:

```cmd
npm run dev
```

_(Leave this terminal window open. You can now access the web dashboard at http://localhost:3000)_

### Step 3: Build the USB Bridge for the Phone

Make sure your Android phone is plugged into your laptop via USB and the screen is unlocked.
Open a **new** terminal in your `MAMS` folder and run exactly this:

```cmd
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
```

_(If it works, it will just print `8000`. You can close this specific terminal window after it prints 8000)._

### Step 4: Run the Flutter Mobile App (The Member App)

Open a **new** terminal in your `MAMS\mams_mobile` folder and run
:
```cmd
flutter run
```

_(This will install and launch the app on your phone. Leave this terminal open to see logs, or press 'r' to hot reload if you make code changes)._

---

### Troubleshooting

- **App stuck on infinite loading / "Sign In" button is blank?**
  This means the USB bridge was broken. Close the app, repeat **Step 3**, and try again.
- **"adb is not recognized" error?**
  You used `adb reverse` instead of the full `%LOCALAPPDATA%` path provided in Step 3. Always copy and paste the full command!
