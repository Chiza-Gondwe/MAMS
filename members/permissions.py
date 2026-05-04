from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role == 'admin'

class IsMember(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in ['admin', 'member', 'pta']

class IsPTA(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in ['admin', 'pta']