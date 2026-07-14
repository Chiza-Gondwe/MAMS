import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ['*']

from rest_framework.test import APIClient
from django.contrib.auth.models import User

client = APIClient()
user = User.objects.first()
client.force_authenticate(user=user)

response = client.post('/api/zones/', {'name': 'zone 1'}, format='json')
print("Status Code:", response.status_code)
if hasattr(response, 'data'):
    print("Response Data:", response.data)
else:
    print("Response Content:", response.content)
