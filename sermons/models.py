from django.db import models

class Sermon(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='sermons', null=True, blank=True)
    title = models.CharField(max_length=255)
    speaker = models.CharField(max_length=255)
    date_preached = models.DateField()
    description = models.TextField(blank=True, null=True)
    audio_file = models.FileField(upload_to='sermons/audio/', blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    notes = models.FileField(upload_to='sermons/notes/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.speaker}"
