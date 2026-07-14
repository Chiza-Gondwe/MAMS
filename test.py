import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from members.models import Member
for m in Member.objects.all():
    username = m.user.username if m.user else 'no-user'
    print(f"User: {username}, Church ID: {m.organization_id}, First: {m.first_name}, Role: {m.role}")
