from django.db import models
from members.models import Member

class AttendanceSession(models.Model):
    SESSION_TYPES = [
        ('church', 'Church Service'),
        ('pta', 'PTA Meeting'),
    ]

    title = models.CharField(max_length=200)
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES)
    date = models.DateField()
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.date}"


class AttendanceRecord(models.Model):
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='attendance')
    scanned_at = models.DateTimeField(auto_now_add=True)
    is_first_visit = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'member')

    def __str__(self):
        return f"{self.member} - {self.session}"