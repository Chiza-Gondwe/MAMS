import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from church_profile.models import Organization
try:
    org = Organization.objects.get(name='Test Church')
    org.delete()
    print("Deleted")
except Exception as e:
    import traceback
    traceback.print_exc()
