import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from church_profile.models import Organization
print(f"Total orgs: {Organization.objects.count()}")
for org in Organization.objects.all():
    print(f"- {org.name}")
