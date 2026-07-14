from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import PrayerRequest
from .serializers import PrayerRequestSerializer

class PrayerRequestViewSet(BaseMultiTenantViewSet):
    serializer_class = PrayerRequestSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['request_text', 'member__first_name', 'member__last_name']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return PrayerRequest.objects.none()
            
        profile = user.member_profile
        base_query = PrayerRequest.objects.filter(organization=profile.organization)
        
        if profile.role in ['admin', 'pta']: # Admins see all
            return base_query.order_by('-created_at')
            
        # Regular members see public requests OR their own private requests
        return base_query.filter(Q(is_private=False) | Q(member=profile)).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.member_profile.organization,
            member=self.request.user.member_profile
        )
