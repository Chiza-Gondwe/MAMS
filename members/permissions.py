from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            member = request.user.member_profile
            return member.role == 'admin'
        except:
            return False

class IsMember(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            member = request.user.member_profile
            return member.role in ['admin', 'member', 'pta']
        except:
            return False

class IsPTA(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            member = request.user.member_profile
            return member.role in ['admin', 'pta']
        except:
            return False