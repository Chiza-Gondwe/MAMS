from django.db import models
from members.models import Member

class Announcement(models.Model):
    TYPE_CHOICES = [
        ('text', 'Text'),
        ('video', 'Video'),
    ]

    AUDIENCE_CHOICES = [
        ('all', 'All Members'),
        ('church', 'Church Members'),
        ('pta', 'PTA Members'),
    ]

    title = models.CharField(max_length=200)
    content = models.TextField()
    announcement_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='text')
    audience = models.CharField(max_length=10, choices=AUDIENCE_CHOICES, default='all')
    video_url = models.URLField(blank=True, null=True)
    created_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title