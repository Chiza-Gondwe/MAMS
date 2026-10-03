#!/usr/bin/env bash
# ==============================================================================
# One-Command Setup Script for MAMS on PythonAnywhere (Free Beginner Account)
# Run inside PythonAnywhere Bash Console:
#   bash deploy_pythonanywhere.sh
# ==============================================================================
set -e

echo "=== 1. Creating Python Virtual Environment (mams-venv) ==="
python3 -m venv "$HOME/.virtualenvs/mams-venv"
source "$HOME/.virtualenvs/mams-venv/bin/activate"

echo "=== 2. Installing Django & Backend Requirements ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 3. Collecting Static Files ==="
python manage.py collectstatic --noinput

echo "=== 4. Running Database Migrations ==="
python manage.py migrate

echo ""
echo "=============================================================================="
echo "  SUCCESS! Backend environment, static files, and database migrations are done!"
echo "  Next: Go to the 'Web' tab on PythonAnywhere and click the green 'Reload' button."
echo "=============================================================================="
