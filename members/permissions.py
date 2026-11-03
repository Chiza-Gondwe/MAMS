from rest_framework.permissions import BasePermission

class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role == 'superadmin'

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in ['superadmin', 'admin']

class IsTreasurer(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in [
            'superadmin', 'admin', 'treasurer', 'zone_treasurer', 'section_treasurer'
        ]

class IsMainTreasurer(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in ['superadmin', 'admin', 'treasurer']

class IsLeaderOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in [
            'superadmin', 'admin', 'treasurer', 'section_admin', 'zone_admin',
            'section_treasurer', 'zone_treasurer', 'group_leader'
        ]

class IsSectionLeader(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in [
            'superadmin', 'admin', 'section_admin', 'section_leader', 'section_treasurer'
        ]

class IsGroupLeader(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.role in ['superadmin', 'admin', 'group_leader']

class IsMember(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'member_profile'):
            return False
        return request.user.member_profile.status != 'pending_review'

class IsHierarchyAuthorized(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        profile = getattr(request.user, 'member_profile', None)
        if not profile:
            return False
        if profile.role in ['superadmin', 'admin', 'treasurer']:
            return True
        if obj.user == request.user:
            return True
        if profile.role in ['zone_admin', 'zone_treasurer']:
            return obj.zone == profile.zone
        if profile.role in ['section_admin', 'section_treasurer']:
            return obj.section == profile.section
        return False
