from rest_framework import serializers
from .models import ChatChannel, ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'channel',
            'sender',
            'sender_name',
            'sender_role',
            'sender_profile_picture',
            'content',
            'attachment_url',
            'attachment_type',
            'created_at',
            'is_me',
        ]
        read_only_fields = ['id', 'channel', 'sender', 'created_at']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip()

    def get_sender_role(self, obj):
        return obj.sender.get_role_display() if hasattr(obj.sender, 'get_role_display') else obj.sender.role

    def get_sender_profile_picture(self, obj):
        if obj.sender.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.sender.profile_picture.url)
            return obj.sender.profile_picture.url
        return None

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'member_profile'):
            return False
        return obj.sender_id == request.user.member_profile.id

class ChatChannelSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatChannel
        fields = [
            'id',
            'name',
            'description',
            'channel_type',
            'section',
            'zone',
            'ministry',
            'last_message',
            'member_count',
            'created_at',
            'updated_at',
        ]

    def get_last_message(self, obj):
        latest = obj.messages.order_by('-created_at').first()
        if latest:
            request = self.context.get('request')
            is_me = bool(
                request
                and hasattr(request.user, 'member_profile')
                and latest.sender_id == request.user.member_profile.id
            )
            preview_content = latest.content
            if not preview_content:
                if latest.attachment_type == 'audio':
                    preview_content = '🎤 Voice note'
                elif latest.attachment_type == 'video':
                    preview_content = '🎬 Video'
                elif latest.attachment_type == 'image':
                    preview_content = '📷 Photo'
                elif latest.attachment:
                    preview_content = '📎 Attachment'
            return {
                'id': latest.id,
                'content': preview_content,
                'attachment_type': latest.attachment_type,
                'sender_id': latest.sender_id,
                'sender_name': f"{latest.sender.first_name} {latest.sender.last_name}".strip(),
                'is_me': is_me,
                'created_at': latest.created_at.isoformat(),
            }
        return None

    def get_member_count(self, obj):
        if obj.channel_type == 'general':
            return obj.organization.members.filter(status='active').count()
        elif obj.channel_type == 'section' and obj.section:
            return obj.section.members.filter(status='active').count()
        elif obj.channel_type == 'zone' and obj.zone:
            return obj.zone.members.filter(status='active').count()
        elif obj.channel_type == 'ministry' and obj.ministry:
            return obj.ministry.members.filter(status='active').count()
        return 0
