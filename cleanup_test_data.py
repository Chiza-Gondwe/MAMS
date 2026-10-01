import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from django.contrib.auth.models import User
from members.models import Member

# Test accounts to remove (with their organizations)
test_emails = ['chizoo@gmail.com', 'chi@gmail.com', 'chipapa@gmail.com']

print("=== Removing test members & users ===")
for email in test_emails:
    try:
        u = User.objects.get(username=email)
        # Member will cascade-delete with the user if linked
        try:
            m = Member.objects.get(user=u)
            print(f"  Deleting member: {m.first_name} {m.last_name} ({email})")
            m.delete()
        except Member.DoesNotExist:
            print(f"  No member record for {email}")
        u.delete()
        print(f"  Deleted user: {email}")
    except User.DoesNotExist:
        print(f"  User {email} not found — skipping")

print("\n=== Removing test organizations ===")
# Import the actual organization model name
import members.models as mm
# Find the right model
OrgModel = None
for name in ['Organization', 'Congregation', 'Church']:
    if hasattr(mm, name):
        OrgModel = getattr(mm, name)
        print(f"  Using model: {name}")
        break

if OrgModel:
    test_orgs = ['lusaka school', 'Chamboli Secondary School']
    for org_name in test_orgs:
        try:
            org = OrgModel.objects.get(name=org_name)
            print(f"  Deleting organization: {org.name}")
            org.delete()
        except OrgModel.DoesNotExist:
            print(f"  Organization '{org_name}' not found — skipping")
else:
    print("  Could not find Organization model — skipping org cleanup")

print("\n=== Remaining users ===")
for u in User.objects.all().order_by('id'):
    print(f"  {u.username}")

print("\n=== Remaining organizations ===")
if OrgModel:
    for org in OrgModel.objects.all():
        count = Member.objects.filter(**{OrgModel.__name__.lower(): org}).count()
        print(f"  {org.name} ({count} members)")
