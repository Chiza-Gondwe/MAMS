from django.db import models
from members.models import Member, Section, Zone

class Announcement(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='announcements', null=True, blank=True)
    TYPE_CHOICES = [
        ('text', 'Text'),
        ('video', 'Video'),
    ]

    AUDIENCE_CHOICES = [
        ('all', 'Everyone (Church & PTA)'),
        ('members', 'Church Members Only'),
        ('leaders', 'All Leaders'),
        ('section_admins', 'Section Leaders Only'),
        ('zone_admins', 'Zone Leaders Only'),
        ('pta', 'PTA Officials'),
    ]

    title = models.CharField(max_length=200)
    content = models.TextField()
    announcement_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='text')
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    video_url = models.URLField(blank=True, null=True)
    
    # Specific Targets
    target_sections = models.ManyToManyField(Section, blank=True, related_name='announcements')
    target_zones = models.ManyToManyField(Zone, blank=True, related_name='announcements')
    target_ministries = models.ManyToManyField('members.Ministry', blank=True, related_name='announcements')
    
    created_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title