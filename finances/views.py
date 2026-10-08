from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from members.permissions import IsAdmin
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
        return [IsAdmin()]

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
        if profile.role in ['superadmin', 'admin']:
            return qs
        return qs.filter(member=profile)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

