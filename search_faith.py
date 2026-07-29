import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
try:
    user = User.objects.get(email='faith@gmail.com')
    if hasattr(user, 'member_profile') and user.member_profile.organization:
        org = user.member_profile.organization
        print(f"Faith is Admin of: {org.name} (Code: {org.org_code}, Type: {org.org_type})")
    else:
        print("Faith has no organization assigned.")
except User.DoesNotExist:
    print("User Faith not found.")
