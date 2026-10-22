# How to Set Up and Run MAMS on Your Laptop

This guide walks you through running the **MAMS (Membership Affiliation & Management System)** project on your laptop from the downloaded GitHub ZIP file—even if you have never set it up before.

---

## 1. Prerequisites (What You Need Installed)

1. **Python 3.11 or 3.12+** *(Required)*
   - Download from [python.org/downloads](https://www.python.org/downloads/)
   - **Important (Windows):** Tick **"Add python.exe to PATH"** during installation.
2. **Node.js v18+ or v20+** *(Optional — only needed if you want to edit the React frontend code)*
   - Note: The pre-built React web portal (`frontend/dist/`) is already included in this project! When you run the Python backend (`python manage.py runserver`), Django automatically serves the full website at `http://127.0.0.1:8000/`.
   - If you want to run the React dev server separately, download Node.js from [nodejs.org](https://nodejs.org/).
3. **Flutter SDK 3.11+** *(Optional — only needed if you want to build/edit the mobile app source code in `mams_mobile/`)*
   - If you just want to test the Android app on your phone, you can download the ready-made `.apk` directly from:
     `https://github.com/Chiza-Gondwe/MAMS/releases/download/v1.3.0/MAMS_Mobile_Latest.apk`

---

## 2. Step-by-Step Setup Guide

### Step 1: Extract the Project Folder
1. Right-click the downloaded `MAMS-master.zip` file and click **Extract All...**
2. Open the extracted folder (`MAMS-master` or `MAMS`) where you can see `manage.py` and `requirements.txt`.

---

### Step 2: Create the `.env` Configuration File (Important!)
Because `.env` files are excluded from GitHub for security, you must create one in the main project folder (in the same folder as `manage.py`).

Create a new file named **`.env`** and paste the following inside:

#### Option A: Run with SQLite (Easiest — No MySQL Installation Needed!)
```env
DEBUG=True
DB_ENGINE=sqlite3
SECRET_KEY=local-dev-secret-key-12345
```

#### Option B: Run with MySQL Server (Only if you have MySQL installed locally)
If you prefer to use a local MySQL server instead of SQLite, first create an empty database in MySQL (`CREATE DATABASE mams_db;`), then put this in your `.env`:
```env
DEBUG=True
DB_NAME=mams_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
```

---

### Step 3: Set Up the Python Virtual Environment & Install Packages
Open a terminal (**PowerShell** or **Command Prompt** on Windows, or **Terminal** on Mac/Linux) inside the project folder and run these commands one by one:

#### On Windows:
```powershell
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the virtual environment
.\venv\Scripts\activate

# 3. Install required Python libraries
pip install -r requirements.txt
```

#### On Mac / Linux:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> **Troubleshooting `mysqlclient` on Windows/Mac:**  
> If `pip install -r requirements.txt` shows an error while building `mysqlclient` (because you don't have MySQL C++ build tools installed on your laptop) and you are using **Option A (SQLite)**:
> 1. Open `requirements.txt` in Notepad or VS Code.
> 2. Delete or put a `#` in front of line 9 (`# mysqlclient>=2.2.0`).
> 3. Save the file and run `pip install -r requirements.txt` again.

---

### Step 4: Initialize the Database & Create an Admin Account
With your virtual environment still active (`(venv)` showing in the terminal), run:

```powershell
# 1. Create all database tables
python manage.py migrate

# 2. Create your SuperAdmin login account (follow the prompts for username, email, and password)
python manage.py createsuperuser
```

---

### Step 5: Start the Server
Run:
```powershell
python manage.py runserver
```

Now open your web browser and go to:
- **Main Web Portal:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Django Admin Panel:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
- **Interactive API Docs (Swagger):** [http://127.0.0.1:8000/api/schema/swagger-ui/](http://127.0.0.1:8000/api/schema/swagger-ui/)

From the login page at `http://127.0.0.1:8000/login`:
- You can click **"Register Organization"** to register a new Church, School, or Club right from the UI, **OR**
- Log in with the account you created.

---

## 3. (Optional) Running the React Frontend in Development Mode
You do **not** need to run this just to use the web app (since `python manage.py runserver` already serves the built web app at `http://127.0.0.1:8000/`).

However, if you want to edit the React source code inside `frontend/src/` with live hot-reload:
1. Keep Terminal 1 running `python manage.py runserver`.
2. Open a **second terminal** in the project folder and run:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
3. Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## 4. (Optional) Running the Flutter Mobile App from Source
If you have the Flutter SDK installed and want to run the mobile app source code on an emulator or connected phone:
```powershell
cd mams_mobile
flutter pub get
flutter run
```

---

## 5. Common Questions & Quick Fixes

| Issue | Solution |
| :--- | :--- |
| **`OperationalError: (2002, "Can't connect to server on 'localhost'")`** | Django is trying to connect to MySQL because `.env` is missing `DB_ENGINE=sqlite3`. Make sure you created a file named `.env` (not `.env.txt`) in the same folder as `manage.py` containing `DB_ENGINE=sqlite3`. |
| **`pip install` fails on `mysqlclient`** | Open `requirements.txt`, delete the line `mysqlclient>=2.2.0`, save, and run `pip install -r requirements.txt` again (using `DB_ENGINE=sqlite3` in `.env`). |
| **PowerShell says `Activate.ps1 cannot be loaded because running scripts is disabled`** | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell, then run `.\venv\Scripts\activate` again (or use Command Prompt `cmd` instead). |
| **How do I test without setting up anything locally?** | The live cloud version is already hosted online at **[https://mamszambia.pythonanywhere.com](https://mamszambia.pythonanywhere.com)**. |
