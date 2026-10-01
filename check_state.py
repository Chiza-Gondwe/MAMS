import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from church_profile.models import Organization
from members.models import Member

# Check what fields Organization has
org = Organization.objects.first()
print("Organization fields:", [f.name for f in org._meta.get_fields() if hasattr(f, 'name')])
print()

# Check members with no org
for m in Member.objects.all().select_related('organization', 'user'):
    org_name = m.organization.name if m.organization else '(NONE)'
    print(f"  {m.first_name} {m.last_name} | {m.user.username if m.user else '?'} | org={org_name}")
