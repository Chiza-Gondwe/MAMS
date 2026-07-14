import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from django.contrib.auth.models import User
from members.models import Member

print("----- USERS -----")
for user in User.objects.all():
    print(f"User: {user.username} | Email: {user.email} | Superuser: {user.is_superuser}")
    try:
        member = Member.objects.get(user=user)
        print(f"  -> Member Role: {member.role}")
    except Member.DoesNotExist:
        print("  -> No member profile")
print("-----------------")
