from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Announcement
from .serializers import AnnouncementSerializer
from members.permissions import IsAdmin, IsMember, IsLeaderOrAdmin

class AnnouncementViewSet(BaseMultiTenantViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated or not hasattr(self.request.user, 'member_profile'):
            return Announcement.objects.none()
            
        profile = self.request.user.member_profile
        queryset = Announcement.objects.filter(organization=profile.organization).order_by('-created_at')
            
        if profile.role == 'admin':
            return queryset
            
        from django.db.models import Q
        
        allowed_audiences = ['all', 'members']
        if profile.role in ['admin', 'section_admin', 'zone_admin', 'group_leader']:
            allowed_audiences.append('leaders')
            
        if profile.role == 'section_admin':
            allowed_audiences.append('section_admins')
        elif profile.role == 'zone_admin':
            allowed_audiences.append('zone_admins')
        elif profile.role == 'pta':
            allowed_audiences.append('pta')
            
        q_filter = Q(audience__in=allowed_audiences)
        
        # If user has a section, zone, or ministries, they should also see announcements explicitly targeted to those
        if profile.section:
            q_filter |= Q(target_sections=profile.section)
        if profile.zone:
            q_filter |= Q(target_zones=profile.zone)
        if profile.ministries.exists():
            q_filter |= Q(target_ministries__in=profile.ministries.all())
            
        return queryset.filter(q_filter).distinct()

    def perform_create(self, serializer):
        profile = self.request.user.member_profile
        announcement = serializer.save(
            organization=profile.organization,
            created_by=profile
        )
        
        # Enforce scoping logic: If you are a lower leader, you can only announce to your specific domain
        if profile.role == 'section_admin' and profile.section:
            announcement.target_sections.add(profile.section)
            # Remove any other targets they might have tried to spoof
            announcement.target_zones.clear()
            announcement.target_ministries.clear()
        elif profile.role == 'zone_admin' and profile.zone:
            announcement.target_zones.add(profile.zone)
            announcement.target_sections.clear()
            announcement.target_ministries.clear()
        elif profile.role == 'group_leader':
            # They must target at least one of their ministries, we just enforce they can't target outside their domain
            # But the serializer will handle what they selected. Here we ensure they don't target sections/zones.
            announcement.target_sections.clear()
            announcement.target_zones.clear()
            
            # Ensure they only targeted ministries they belong to
            valid_ministries = set(profile.ministries.all())
            for m in announcement.target_ministries.all():
                if m not in valid_ministries:
                    announcement.target_ministries.remove(m)
        
        try:
            from webpush import send_user_notification
            from django.contrib.auth import get_user_model
            
            payload = {
                "head": announcement.title,
                "body": announcement.content[:100] + ('...' if len(announcement.content) > 100 else ''),
                "icon": "/logo192.png",
                "data": {"url": "/dashboard"}
            }
            
            User = get_user_model()
            users = User.objects.filter(member_profile__organization=announcement.organization)
            for u in users:
                try:
                    send_user_notification(user=u, payload=payload, ttl=1000)
                except Exception:
                    pass
        except Exception as e:
            print(f"Failed to send push notifications: {e}")

    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content', 'audience']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsLeaderOrAdmin()]