@echo off
echo ========================================================
echo   MAMS 1-Click Mobile App Update Publisher
echo ========================================================
cd /d "%~dp0"

echo [1/4] Bumping version and build number...
python -c "import json, re, pathlib; vf = pathlib.Path('mams/app_version.json'); d = json.loads(vf.read_text()); b = int(d.get('build_number', 2)) + 1; v = f'1.{b}.0'; d['build_number'] = b; d['version'] = v; vf.write_text(json.dumps(d, indent=2) + '\n'); af = pathlib.Path('mams_mobile/lib/services/api_service.dart'); s = af.read_text(encoding='utf-8'); s = re.sub(r\"currentAppVersion = '[^']+'\", f\"currentAppVersion = '{v}'\", s); s = re.sub(r'currentBuildNumber = \d+', f'currentBuildNumber = {b}', s); af.write_text(s, encoding='utf-8'); print(f'Bumped to v{v} (Build {b})')"

echo [2/4] Building Release APK (arm64-v8a)...
cd mams_mobile
call flutter build apk --release --target-platform android-arm64
cd ..

echo [3/4] Copying APK to server download path...
copy /Y "mams_mobile\build\app\outputs\flutter-apk\app-release.apk" "MAMS_Mobile_Release.apk"

echo [4/4] Pushing update to GitHub...
git add mams/app_version.json mams_mobile/lib/services/api_service.dart MAMS_Mobile_Release.apk
git commit -m "Publish new MAMS Mobile OTA update"
git push origin master

echo ========================================================
echo   Done! Now run on PythonAnywhere Bash:
echo   cd ~/MAMS && git pull && touch /var/www/mamszambia_pythonanywhere_com_wsgi.py
echo   All phones will now show the "Update Available" button!
echo ========================================================
pause
