from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets
from .models import Event
from .serializers import EventSerializer

class EventViewSet(BaseMultiTenantViewSet):
    serializer_class = EventSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Event.objects.none()
        return Event.objects.filter(organization=user.member_profile.organization).order_by('date', 'time')

    def perform_create(self, serializer):
        event = serializer.save(organization=self.request.user.member_profile.organization)
        
        try:
            from webpush import send_user_notification
            from django.contrib.auth import get_user_model
            
            payload = {
                "head": f"New Event: {event.title}",
                "body": f"Join us on {event.date} at {event.time} - {event.location}",
                "icon": "/logo192.png",
                "data": {"url": "/dashboard/events"}
            }
            
            User = get_user_model()
            users = User.objects.filter(member_profile__organization=event.organization)
            for u in users:
                try:
                    send_user_notification(user=u, payload=payload, ttl=1000)
                except Exception:
                    pass
        except Exception as e:
            print(f"Failed to send push notifications: {e}")

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        from members.permissions import IsAdmin
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]
