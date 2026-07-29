from django.db import models

class Event(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='events', null=True, blank=True)
    AUDIENCE_CHOICES = [
        ('all', 'Everyone (Church & PTA)'),
        ('members', 'Church Members Only'),
        ('leaders', 'All Leaders'),
        ('section_admins', 'Section Leaders Only'),
        ('zone_admins', 'Zone Leaders Only'),
        ('pta', 'PTA Officials'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    date = models.DateField()
    time = models.TimeField()
    location = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100, default='Service') # Service, Meeting, Activity
    
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    target_sections = models.ManyToManyField('members.Section', blank=True, related_name='events')
    target_zones = models.ManyToManyField('members.Zone', blank=True, related_name='events')
    target_ministries = models.ManyToManyField('members.Ministry', blank=True, related_name='events')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
