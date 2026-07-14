from rest_framework import serializers
from .models import Announcement
from members.models import Section, Zone, Ministry

class AnnouncementSerializer(serializers.ModelSerializer):
    target_sections = serializers.PrimaryKeyRelatedField(many=True, queryset=Section.objects.all(), required=False)
    target_zones = serializers.PrimaryKeyRelatedField(many=True, queryset=Zone.objects.all(), required=False)
    target_ministries = serializers.PrimaryKeyRelatedField(many=True, queryset=Ministry.objects.all(), required=False)

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ['created_by']

    def validate_video_url(self, value):
        if value and not value.startswith('https://'):
            raise serializers.ValidationError(
                "Video URL must start with https://"
            )
        return value

    def validate(self, data):
        announcement_type = data.get('announcement_type')
        if announcement_type is None and self.instance:
            announcement_type = self.instance.announcement_type

        video_url = data.get('video_url')
        if video_url is None and self.instance:
            video_url = self.instance.video_url

        if announcement_type == 'video' and not video_url:
            raise serializers.ValidationError(
                {"video_url": "Video URL is required for video announcements."}
            )
        return data