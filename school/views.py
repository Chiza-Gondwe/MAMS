from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import ClassRoom, Student
from .serializers import ClassRoomSerializer, StudentSerializer
from members.permissions import IsAdmin

class ClassRoomViewSet(BaseMultiTenantViewSet):
    serializer_class = ClassRoomSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return ClassRoom.objects.none()
        return ClassRoom.objects.filter(organization=user.member_profile.organization).order_by('name')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

class StudentViewSet(BaseMultiTenantViewSet):
    serializer_class = StudentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'class_room__name']
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Student.objects.none()
        return Student.objects.filter(organization=user.member_profile.organization).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]
