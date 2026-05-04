from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Announcement
from .serializers import AnnouncementSerializer
from members.permissions import IsAdmin, IsMember

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-created_at')
    serializer_class = AnnouncementSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content', 'audience']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]