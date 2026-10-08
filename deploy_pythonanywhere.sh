#!/usr/bin/env bash
# ==============================================================================
# One-Command Setup Script for MAMS on PythonAnywhere (Free Beginner Account)
# Run inside PythonAnywhere Bash Console:
#   bash deploy_pythonanywhere.sh
# ==============================================================================
set -e

echo "=== 1. Checking .env configuration ==="
if [ ! -f .env ]; then
cat << EOF > .env
DB_ENGINE=sqlite3
SECRET_KEY=${SECRET_KEY:-django-insecure-change-me-in-production}
EMAIL_HOST_USER=${EMAIL_HOST_USER:-mamssystem996@gmail.com}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD:-your-gmail-app-password}
DEFAULT_FROM_EMAIL=MAMS Management System <${EMAIL_HOST_USER:-mamssystem996@gmail.com}>
EOF
echo "Created default .env template (update EMAIL_HOST_PASSWORD in .env if needed)."
else
echo "Existing .env found — keeping current environment configuration."
fi

echo "=== 2. Creating Python Virtual Environment (mams-venv) ==="
python3 -m venv "$HOME/.virtualenvs/mams-venv"
source "$HOME/.virtualenvs/mams-venv/bin/activate"

echo "=== 3. Installing Django & Backend Requirements ==="
pip install --upgrade pip
pip install "Django>=5.1" django-cors-headers django-filter djangorestframework djangorestframework-simplejwt drf-spectacular django-webpush django-apscheduler Pillow PyJWT python-dotenv qrcode requests gunicorn whitenoise

echo "=== 4. Running Database Migrations ==="
python manage.py migrate

echo "=== 5. Seeding Superadmin & UCZ Trinity Admin Accounts ==="
python manage.py shell -c "
from django.contrib.auth.models import User
from church_profile.models import Organization
from members.models import Member
from chat.models import ChatChannel

# 1. Superadmin (admin@example.com)
u1, _ = User.objects.get_or_create(username='admin@example.com', defaults={'email': 'admin@example.com', 'first_name': 'System', 'last_name': 'Admin', 'is_staff': True, 'is_superuser': True, 'is_active': True})
u1.password = 'pbkdf2_sha256\$1200000\$XZUNWXWbxUFlYN7tDCTZfe\$EbegL7udbkxtJy+6oqzD2xZ6ydfNJBfh9SDHvi8Hcjg='
u1.save()
Member.objects.get_or_create(user=u1, defaults={'first_name': 'System', 'last_name': 'Admin', 'email': 'admin@example.com', 'phone_number': '0970000001', 'role': 'superadmin', 'status': 'active', 'is_verified': True})

# 2. UCZ Trinity Organization & Admin (Chiza Gondwe)
org, _ = Organization.objects.get_or_create(org_code='LUS-C-86EC94', defaults={'name': 'UCZ Trinity', 'org_type': 'CHURCH', 'city': 'LUSAKA', 'address': 'Lusaka', 'phone': '0979642665', 'email': 'gondwechiza28@gmail.com'})
u2, _ = User.objects.get_or_create(username='gondwechiza28@gmail.com', defaults={'email': 'gondwechiza28@gmail.com', 'first_name': 'Chiza', 'last_name': 'Gondwe', 'is_active': True})
u2.password = 'pbkdf2_sha256\$1200000\$w8Dqy8CvZ26YGp7klWI0kd\$3ZMT6aZFilzyT2KFM6n6i2un5ylCgJmc0KoM/ZfpDxQ='
u2.save()
Member.objects.get_or_create(user=u2, defaults={'first_name': 'Chiza', 'last_name': 'Gondwe', 'email': 'gondwechiza28@gmail.com', 'phone_number': '0979642665', 'role': 'admin', 'status': 'active', 'organization': org, 'is_verified': True})
ChatChannel.objects.get_or_create(organization=org, channel_type='general', defaults={'name': 'UCZ Trinity - General', 'description': 'Church & community-wide group discussion and updates'})
print('Seeded System Admin and Chiza Gondwe (UCZ Trinity) successfully!')
"

echo "=== 6. Collecting Static Files ==="
python manage.py collectstatic --noinput

echo ""
echo "=============================================================================="
echo "  SUCCESS! Backend environment, database, and accounts are ready!"
echo "  Next: Go to the 'Web' tab on PythonAnywhere and configure your Web App."
echo "=============================================================================="
