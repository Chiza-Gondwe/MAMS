import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from church_profile.models import Organization

# Recreate UCZ Trinity Congregation
trinity, created = Organization.objects.get_or_create(
    name='UCZ Trinity Congregation',
    defaults={
        'org_code': 'KIT-T-001',
        'org_type': 'church',
        'city': 'Lusaka',
    }
)
if created:
    print("Created: UCZ Trinity Congregation")
else:
    print("Already exists: UCZ Trinity Congregation")

print("\n=== All Organizations ===")
for org in Organization.objects.all():
    print(f"  - {org.name} (code: {org.org_code})")
