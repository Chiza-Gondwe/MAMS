from django.db import models
from church_profile.models import Organization
from members.models import Member, Section, Zone, Ministry

class ChatChannel(models.Model):
    CHANNEL_TYPE_CHOICES = [
        ('general', 'General (All Organization)'),
        ('section', 'Section Group'),
        ('zone', 'Zone Group'),
        ('ministry', 'Ministry / Department Group'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='chat_channels')
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    channel_type = models.CharField(max_length=20, choices=CHANNEL_TYPE_CHOICES, default='general')
    
    # Scoping relations
    section = models.ForeignKey(Section, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_channels')
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_channels')
    ministry = models.ForeignKey(Ministry, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_channels')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_channel_type_display()})"

class ChatMessage(models.Model):
    ATTACHMENT_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Voice Note / Audio'),
        ('file', 'File'),
    ]

    channel = models.ForeignKey(ChatChannel, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='chat_messages')
    content = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', null=True, blank=True)
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPE_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        preview = self.content[:30] if self.content else f"[{self.attachment_type or 'attachment'}]"
        return f"{self.sender.first_name}: {preview}"

