from django.db import models

class PrayerRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('praying', 'Currently Praying'),
        ('answered', 'Answered!'),
    ]

    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='prayer_requests', null=True, blank=True)
    member = models.ForeignKey('members.Member', on_delete=models.SET_NULL, null=True, blank=True, related_name='prayer_requests')
    request_text = models.TextField()
    is_private = models.BooleanField(default=False, help_text="If true, only admins can see this request")
    is_anonymous = models.BooleanField(default=False, help_text="If true, name is hidden from other members")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Prayer request by {'Anonymous' if self.is_anonymous else self.member} - {self.status}"
