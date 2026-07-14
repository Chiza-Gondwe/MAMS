import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from members.models import Member
from church_profile.models import Organization

# 1. Create Organization
org, created = Organization.objects.get_or_create(
    name="Test Church",
    defaults={
        'org_type': 'CHURCH',
        'city': 'LUSAKA'
    }
)
print(f"Organization: {org.name} (Code: {org.org_code})")

# 2. Create Superadmin User
email = "admin@example.com"
password = "password123"

user, created = User.objects.get_or_create(
    username=email,
    defaults={
        'email': email,
        'password': make_password(password),
        'first_name': 'System',
        'last_name': 'Admin',
        'is_superuser': True,
        'is_staff': True
    }
)

if not created:
    user.password = make_password(password)
    user.is_superuser = True
    user.is_staff = True
    user.save()

# 3. Create Member Profile
member, created = Member.objects.get_or_create(
    user=user,
    defaults={
        'organization': org,
        'email': email,
        'first_name': 'System',
        'last_name': 'Admin',
        'role': 'superadmin',
        'status': 'active',
        'is_temporary_password': False
    }
)

if not created:
    member.role = 'superadmin'
    member.organization = org
    member.status = 'active'
    member.save()

print(f"Superadmin created successfully!")
print(f"Username/Email: {email}")
print(f"Password: {password}")
print(f"Role: {member.role}")
