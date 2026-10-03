from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import ChatChannel, ChatMessage
from .serializers import ChatChannelSerializer, ChatMessageSerializer
from members.models import Section, Zone, Ministry

def ensure_channels_exist(organization):
    """Auto-creates standard organization channels if not already present."""
    if not organization:
        return
        
    # 1. Ensure General Channel
    ChatChannel.objects.get_or_create(
        organization=organization,
        channel_type='general',
        defaults={
            'name': f"{organization.name} - General",
            'description': 'Church & community-wide group discussion and updates',
        }
    )

    # 2. Ensure Section Channels
    for sec in Section.objects.filter(organization=organization):
        ChatChannel.objects.get_or_create(
            organization=organization,
            channel_type='section',
            section=sec,
            defaults={
                'name': f"{sec.name} Section",
                'description': f"Private discussion group for {sec.name} Section members",
            }
        )

    # 3. Ensure Zone Channels
    for zn in Zone.objects.filter(organization=organization):
        ChatChannel.objects.get_or_create(
            organization=organization,
            channel_type='zone',
            zone=zn,
            defaults={
                'name': f"{zn.name} Zone",
                'description': f"Private discussion group for {zn.name} Zone members",
            }
        )

    # 4. Ensure Ministry Channels
    for min_item in Ministry.objects.filter(organization=organization):
        ChatChannel.objects.get_or_create(
            organization=organization,
            channel_type='ministry',
            ministry=min_item,
            defaults={
                'name': f"{min_item.name}",
                'description': f"Group chat for {min_item.name}",
            }
        )

def get_authorized_channels_queryset(profile):
    """Filters channels strictly according to user role and domain scoping."""
    org = profile.organization
    if not org:
        return ChatChannel.objects.none()

    ensure_channels_exist(org)
    base_qs = ChatChannel.objects.filter(organization=org)

    # Tenant Admin & Superadmin can view and chat in ALL groups within their organization
    if profile.role in ['superadmin', 'admin']:
        return base_qs

    # Zone Admin: General + Their Zone + Sections in their Zone
    if profile.role == 'zone_admin' and profile.zone:
        return base_qs.filter(
            Q(channel_type='general') |
            Q(channel_type='zone', zone=profile.zone) |
            Q(channel_type='section', section__zone=profile.zone)
        )

    # Section Admin: General + Their Section
    if profile.role == 'section_admin' and profile.section:
        return base_qs.filter(
            Q(channel_type='general') |
            Q(channel_type='section', section=profile.section)
        )

    # Regular Members, PTA, Group Leaders: General + their specific domain associations
    q_filter = Q(channel_type='general')
    if profile.section:
        q_filter |= Q(channel_type='section', section=profile.section)
    if profile.zone:
        q_filter |= Q(channel_type='zone', zone=profile.zone)

    # Ministry memberships
    user_ministry_ids = profile.ministries.values_list('id', flat=True)
    if user_ministry_ids:
        q_filter |= Q(channel_type='ministry', ministry_id__in=user_ministry_ids)

    return base_qs.filter(q_filter).distinct()


class ChannelListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)

        profile = request.user.member_profile
        channels = get_authorized_channels_queryset(profile)
        serializer = ChatChannelSerializer(channels, many=True, context={'request': request})
        return Response(serializer.data)


class ChannelMessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, channel_id):
        if not hasattr(request.user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)

        profile = request.user.member_profile
        channel = get_object_or_404(ChatChannel, id=channel_id)

        # Check authorization
        authorized_channels = get_authorized_channels_queryset(profile)
        if not authorized_channels.filter(id=channel.id).exists():
            return Response({'error': 'You do not have permission to access this channel.'}, status=status.HTTP_403_FORBIDDEN)

        messages = channel.messages.all().select_related('sender')

        # Fast polling support: ?since_id=123
        since_id = request.query_params.get('since_id')
        if since_id:
            try:
                messages = messages.filter(id__gt=int(since_id))
            except ValueError:
                pass

        # Return latest 100 messages
        if not since_id:
            messages = messages.order_by('-created_at')[:100]
            messages = list(reversed(messages))

        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, channel_id):
        if not hasattr(request.user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)

        profile = request.user.member_profile
        channel = get_object_or_404(ChatChannel, id=channel_id)

        # Check authorization
        authorized_channels = get_authorized_channels_queryset(profile)
        if not authorized_channels.filter(id=channel.id).exists():
            return Response({'error': 'You do not have permission to post in this channel.'}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get('content') or '').strip()
        attachment = request.FILES.get('attachment')
        attachment_type = (request.data.get('attachment_type') or '').strip().lower() or None

        if not content and not attachment:
            return Response({'error': 'Message must include text or a media attachment.'}, status=status.HTTP_400_BAD_REQUEST)

        if attachment and not attachment_type:
            mime = (getattr(attachment, 'content_type', '') or '').lower()
            fname = (getattr(attachment, 'name', '') or '').lower()
            if mime.startswith('audio/') or fname.endswith(('.m4a', '.aac', '.mp3', '.wav', '.ogg', '.webm', '.opus', '.3gp')):
                attachment_type = 'audio'
            elif mime.startswith('video/') or fname.endswith(('.mp4', '.mov', '.mkv', '.avi', '.3gpp')):
                attachment_type = 'video'
            elif mime.startswith('image/') or fname.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                attachment_type = 'image'
            else:
                attachment_type = 'file'

        message = ChatMessage.objects.create(
            channel=channel,
            sender=profile,
            content=content,
            attachment=attachment,
            attachment_type=attachment_type,
        )

        serializer = ChatMessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatMessageDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, message_id):
        if not hasattr(request.user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)

        profile = request.user.member_profile
        message = get_object_or_404(ChatMessage, id=message_id)

        is_sender = (message.sender_id == profile.id)
        is_admin = (profile.role in ['superadmin', 'admin'] and message.channel.organization_id == profile.organization_id)

        if not (is_sender or is_admin):
            return Response({'error': 'You do not have permission to delete this message.'}, status=status.HTTP_403_FORBIDDEN)

        message.delete()
        return Response({'message': 'Message deleted successfully.'}, status=status.HTTP_200_OK)


class ChatBulkDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)

        profile = request.user.member_profile
        raw_ids = request.data.get('message_ids', [])
        if not isinstance(raw_ids, list) or not raw_ids:
            return Response({'error': 'Provide a list of message_ids to delete.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_ids = [int(i) for i in raw_ids if str(i).isdigit()]
        messages = ChatMessage.objects.filter(id__in=valid_ids).select_related('channel')

        deleted_ids = []
        for msg in messages:
            is_sender = (msg.sender_id == profile.id)
            is_admin = (profile.role in ['superadmin', 'admin'] and msg.channel.organization_id == profile.organization_id)
            if is_sender or is_admin:
                deleted_ids.append(msg.id)

        if deleted_ids:
            ChatMessage.objects.filter(id__in=deleted_ids).delete()

        return Response({
            'message': f'Deleted {len(deleted_ids)} message(s).',
            'deleted_ids': deleted_ids,
        }, status=status.HTTP_200_OK)

