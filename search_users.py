import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
users = User.objects.all()
for u in users:
    role = 'Superuser/No Profile'
    if hasattr(u, 'member_profile'):
        role = u.member_profile.role
    print(f"- {u.first_name} {u.last_name} ({u.email}) - Role: {role}")
