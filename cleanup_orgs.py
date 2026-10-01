import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from church_profile.models import Organization

# Check for lusaka school case-insensitively
for org in Organization.objects.all():
    if 'lusaka' in org.name.lower() or 'school' in org.name.lower():
        print(f"  Deleting: {org.name}")
        org.delete()

print("\n=== Remaining organizations ===")
for org in Organization.objects.all():
    print(f"  - {org.name}")
