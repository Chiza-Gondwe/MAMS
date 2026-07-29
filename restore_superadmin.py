import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from django.contrib.auth import get_user_model
from members.models import Member
User = get_user_model()
try:
    user = User.objects.get(email='admin@example.com')
    member, created = Member.objects.get_or_create(
        user=user,
        defaults={
            'first_name': 'System',
            'last_name': 'Admin',
            'email': 'admin@example.com',
            'role': 'superadmin',
            'status': 'active',
            'is_verified': True,
            'organization': None
        }
    )
    if not created:
        member.role = 'superadmin'
        member.organization = None
        member.save()
    print("Superadmin profile restored successfully.")
except User.DoesNotExist:
    print("Superadmin user not found.")
