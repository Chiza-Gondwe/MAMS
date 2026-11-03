from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from members.permissions import IsAdmin, IsTreasurer, IsMainTreasurer
from .models import LedgerAccount, Donation
from .serializers import LedgerAccountSerializer, DonationSerializer

class LedgerAccountViewSet(BaseMultiTenantViewSet):
    serializer_class = LedgerAccountSerializer

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'member_profile', None)
        if not user.is_authenticated or not profile or not profile.organization:
            return LedgerAccount.objects.none()
        return LedgerAccount.objects.filter(organization=profile.organization).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsMainTreasurer()]

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

class DonationViewSet(BaseMultiTenantViewSet):
    serializer_class = DonationSerializer

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'member_profile', None)
        if not user.is_authenticated or not profile or not profile.organization:
            return Donation.objects.none()
        
        qs = Donation.objects.filter(organization=profile.organization).order_by('-created_at')
        
        # 1. Main Church Admins & Church Treasurers see all church donations
        if profile.role in ['superadmin', 'admin', 'treasurer']:
            return qs
            
        # 2. Zone Treasurer sees donations for members within their zone
        if profile.role == 'zone_treasurer':
            if profile.zone:
                return qs.filter(member__zone=profile.zone)
            return Donation.objects.none()

        # 3. Section Treasurer sees donations for members within their section
        if profile.role == 'section_treasurer':
            if profile.section:
                return qs.filter(member__section=profile.section)
            return Donation.objects.none()

        # 4. Regular member only sees their own personal contributions
        return qs.filter(member=profile)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsTreasurer()]

    def perform_create(self, serializer):
        profile = self.request.user.member_profile
        serializer.save(organization=profile.organization)
