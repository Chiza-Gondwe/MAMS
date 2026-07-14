import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from members.models import Member
from church_profile.models import Organization

default_church = Organization.objects.first()
if default_church:
    members = Member.objects.filter(church__isnull=True)
    count = members.count()
    members.update(organization=default_church)
    print(f"Updated {count} members to church {default_organization.id}")
else:
    print("No church found!")
