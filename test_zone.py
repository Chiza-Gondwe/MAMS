import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from members.models import Zone

try:
    Zone.objects.create(name='zone 1')
    Zone.objects.create(name='zone 1')
    print("Successfully created duplicate zones!")
except Exception as e:
    print(f"Error: {e}")
