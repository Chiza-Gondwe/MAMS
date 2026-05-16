from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Announcement
from .serializers import AnnouncementSerializer
from members.permissions import IsAdmin, IsMember

class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        queryset = Announcement.objects.all().order_by('-created_at')
        if not self.request.user.is_authenticated:
            return queryset.none()
            
        profile = getattr(self.request.user, 'member_profile', None)
        if not profile:
            return queryset.none()
            
        if profile.role == 'admin':
            return queryset
        elif profile.role == 'pta':
            return queryset.filter(audience__in=['all', 'pta'])
        else:
            return queryset.filter(audience__in=['all', 'church'])
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content', 'audience']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]