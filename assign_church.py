import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mams.settings')
django.setup()

from church_profile.models import Organization
from members.models import Member, Section, Zone, Ministry
from events.models import Event
from announcements.models import Announcement
from school.models import ClassRoom, Student
from attendance.models import AttendanceSession
from communications.models import EmailLog
from finances.models import LedgerAccount, Donation

church, created = Organization.objects.get_or_create(id=1, defaults={'name': 'First Church of Jesus Christ'})

models_to_update = [
    Member, Section, Zone, Ministry, Event, Announcement,
    ClassRoom, Student, AttendanceSession, EmailLog,
    LedgerAccount, Donation
]

for model in models_to_update:
    updated = model.objects.filter(church__isnull=True).update(organization=church)
    print(f"Updated {updated} records for {model.__name__}")

print("Data migration complete.")
