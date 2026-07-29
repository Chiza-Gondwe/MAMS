import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()
from django.apps import apps
from django.db.models import CharField, TextField

for model in apps.get_models():
    if model._meta.app_label in ['members', 'church_profile', 'events', 'finances', 'school', 'sermons', 'sessions', 'attendance', 'auth']:
        fields = [f.name for f in model._meta.get_fields() if isinstance(f, (CharField, TextField))]
        for field in fields:
            kwargs = {f'{field}__icontains': 'LUS-C-002'}
            try:
                results = model.objects.filter(**kwargs)
                if results.exists():
                    print(f'Found in {model.__name__}.{field}:')
                    for r in results:
                        print(r.__dict__)
            except Exception as e:
                pass
