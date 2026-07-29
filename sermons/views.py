from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Sermon
from .serializers import SermonSerializer
from members.permissions import IsAdmin

class SermonViewSet(BaseMultiTenantViewSet):
    serializer_class = SermonSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'speaker', 'description']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Sermon.objects.none()
            
        profile = user.member_profile
        queryset = Sermon.objects.filter(organization=profile.organization).order_by('-date_preached', '-created_at')
            
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
            
        # 1. Targeted to user's specific domains
        target_q = Q()
        if profile.section:
            target_q |= Q(target_sections=profile.section)
        if profile.zone:
            target_q |= Q(target_zones=profile.zone)
        if profile.ministries.exists():
            target_q |= Q(target_ministries__in=profile.ministries.all())
            
        # 2. Global (no specific targets) AND allowed audience
        global_q = Q(target_sections__isnull=True) & Q(target_zones__isnull=True) & Q(target_ministries__isnull=True) & Q(audience__in=allowed_audiences)
        
        if target_q:
            final_q = target_q | global_q
        else:
            final_q = global_q
            
        return queryset.filter(final_q).distinct()

    def perform_create(self, serializer):
        sermon = serializer.save(organization=self.request.user.member_profile.organization)
        
        try:
            from webpush import send_user_notification
            from django.contrib.auth import get_user_model
            
            payload = {
                "head": f"New Sermon Uploaded",
                "body": f"{sermon.title} by {sermon.speaker}",
                "icon": "/logo192.png",
                "data": {"url": "/dashboard/sermons"}
            }
            
            User = get_user_model()
            from django.db.models import Q
            
            # Scoped Push Notification logic
            q = Q(member_profile__organization=sermon.organization)
            
            if sermon.audience == 'members':
                pass # All members
            elif sermon.audience == 'leaders':
                q &= Q(member_profile__role__in=['admin', 'section_admin', 'zone_admin', 'group_leader'])
            elif sermon.audience == 'section_admins':
                q &= Q(member_profile__role__in=['admin', 'section_admin'])
            elif sermon.audience == 'zone_admins':
                q &= Q(member_profile__role__in=['admin', 'zone_admin'])
            elif sermon.audience == 'pta':
                q &= Q(member_profile__role='pta')
                
            target_sections = sermon.target_sections.all()
            target_zones = sermon.target_zones.all()
            target_ministries = sermon.target_ministries.all()
            
            if target_sections.exists() or target_zones.exists() or target_ministries.exists():
                target_q = Q()
                if target_sections.exists():
                    target_q |= Q(member_profile__section__in=target_sections)
                if target_zones.exists():
                    target_q |= Q(member_profile__zone__in=target_zones)
                if target_ministries.exists():
                    target_q |= Q(member_profile__ministries__in=target_ministries)
                q &= target_q

            users = User.objects.filter(q).distinct()
            for u in users:
                try:
                    send_user_notification(user=u, payload=payload, ttl=1000)
                except Exception:
                    pass
        except Exception as e:
            print(f"Failed to send push notifications: {e}")

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]
