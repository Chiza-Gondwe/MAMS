from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets
from .models import LedgerAccount, Donation
from .serializers import LedgerAccountSerializer, DonationSerializer

class LedgerAccountViewSet(BaseMultiTenantViewSet):
    serializer_class = LedgerAccountSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return LedgerAccount.objects.none()
        return LedgerAccount.objects.filter(organization=user.member_profile.organization).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

class DonationViewSet(BaseMultiTenantViewSet):
    serializer_class = DonationSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Donation.objects.none()
        return Donation.objects.filter(organization=user.member_profile.organization).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)
