from django.db import models

class Event(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='events', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    date = models.DateField()
    time = models.TimeField()
    location = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100, default='Service') # Service, Meeting, Activity
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
