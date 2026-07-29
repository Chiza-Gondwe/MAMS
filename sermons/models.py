from django.db import models

class Sermon(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='sermons', null=True, blank=True)
    AUDIENCE_CHOICES = [
        ('all', 'Everyone (Church & PTA)'),
        ('members', 'Church Members Only'),
        ('leaders', 'All Leaders'),
        ('section_admins', 'Section Leaders Only'),
        ('zone_admins', 'Zone Leaders Only'),
        ('pta', 'PTA Officials'),
    ]

    title = models.CharField(max_length=255)
    speaker = models.CharField(max_length=255)
    date_preached = models.DateField()
    description = models.TextField(blank=True, null=True)
    audio_file = models.FileField(upload_to='sermons/audio/', blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    notes = models.FileField(upload_to='sermons/notes/', blank=True, null=True)
    
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    target_sections = models.ManyToManyField('members.Section', blank=True, related_name='sermons')
    target_zones = models.ManyToManyField('members.Zone', blank=True, related_name='sermons')
    target_ministries = models.ManyToManyField('members.Ministry', blank=True, related_name='sermons')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.speaker}"
