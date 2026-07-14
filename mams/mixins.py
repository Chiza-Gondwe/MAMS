from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

class BaseMultiTenantViewSet(viewsets.ModelViewSet):
    """
    Base viewset for enforcing tenant isolation across the entire MAMS platform.
    Ensures users only see data for their specific Organization.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return self.queryset.none()
            
        profile = user.member_profile
        
        # Super Admins see everything
        if profile.role == 'superadmin':
            return super().get_queryset()
            
        # If pending review or no organization, see nothing
        if not profile.organization or profile.status == 'pending_review':
            return self.queryset.none()
            
        return super().get_queryset().filter(organization=profile.organization)

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'member_profile') and user.member_profile.organization:
            serializer.save(organization=user.member_profile.organization)
        else:
            serializer.save()
