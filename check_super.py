import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
try:
    user = User.objects.get(email='admin@example.com')
    if hasattr(user, 'member_profile'):
        print(f"Superadmin exists. Member Profile Role: {user.member_profile.role}")
        print(f"Organization: {user.member_profile.organization}")
    else:
        print("Superadmin exists, but HAS NO MEMBER PROFILE!")
except User.DoesNotExist:
    print("User admin@example.com not found!")
