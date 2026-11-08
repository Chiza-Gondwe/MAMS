from rest_framework import serializers
from .models import Announcement
from members.models import Section, Zone, Ministry

class AnnouncementSerializer(serializers.ModelSerializer):
    target_sections = serializers.PrimaryKeyRelatedField(many=True, queryset=Section.objects.all(), required=False)
    target_zones = serializers.PrimaryKeyRelatedField(many=True, queryset=Zone.objects.all(), required=False)
    target_ministries = serializers.PrimaryKeyRelatedField(many=True, queryset=Ministry.objects.all(), required=False)
    video_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ['created_by']

    def get_video_file_url(self, obj):
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # If external video_url is empty but video_file is present, populate video_url with file url
        if not ret.get('video_url') and instance.video_file:
            ret['video_url'] = ret.get('video_file_url')
        return ret

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

        video_file = data.get('video_file')
        if video_file is None and self.instance:
            video_file = self.instance.video_file

        if announcement_type == 'video' and not video_url and not video_file:
            raise serializers.ValidationError(
                {"video_url": "Video URL is required for video announcements."}
            )
        return data
