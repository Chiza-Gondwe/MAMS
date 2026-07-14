from django.db import models
from django.contrib.auth.models import User

class EmailLog(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='email_logs', null=True, blank=True)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    recipient_count = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='Sent')
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject
