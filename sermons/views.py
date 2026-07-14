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
        return Sermon.objects.filter(organization=user.member_profile.organization).order_by('-date_preached', '-created_at')

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
            users = User.objects.filter(member_profile__organization=sermon.organization)
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
