import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
try:
    user = User.objects.get(email='sepi@gmail.com')
    user.delete()
    print("Successfully deleted orphaned user sepi@gmail.com")
except User.DoesNotExist:
    print("User not found.")
