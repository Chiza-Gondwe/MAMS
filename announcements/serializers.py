from rest_framework import serializers
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'

    def validate_video_url(self, value):
        if value and not value.startswith('https://'):
            raise serializers.ValidationError(
                "Video URL must start with https://"
            )
        return value