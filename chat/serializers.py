from rest_framework import serializers
from .models import ChatChannel, ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
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
            return {
                'id': latest.id,
                'content': latest.content,
                'sender_name': f"{latest.sender.first_name} {latest.sender.last_name}".strip(),
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
