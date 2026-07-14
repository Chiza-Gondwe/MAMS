from mams.mixins import BaseMultiTenantViewSet
import qrcode
import io
from django.core.files.base import ContentFile
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import APIException
from django_filters.rest_framework import DjangoFilterBackend
from .models import AttendanceSession, AttendanceRecord
from .serializers import AttendanceSessionSerializer, AttendanceRecordSerializer
from members.models import Member
from members.permissions import IsAdmin, IsMember

class AttendanceSessionViewSet(BaseMultiTenantViewSet):
    serializer_class = AttendanceSessionSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return AttendanceSession.objects.none()
        return AttendanceSession.objects.filter(organization=user.member_profile.organization).order_by('-date')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        if self.action == 'scan':
            return [IsMember()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        session = serializer.save(organization=self.request.user.member_profile.organization)
        try:
            # Generate a clickable URL instead of raw text
            qr_data = f"http://127.0.0.1:3000/scan/{session.id}"
            qr = qrcode.make(qr_data)
            buffer = io.BytesIO()
            qr.save(buffer, format='PNG')
            file_name = f"session_{session.id}.png"
            session.qr_code.save(file_name, ContentFile(buffer.getvalue()), save=True)
        except Exception as e:
            session.delete()
            raise APIException(f"QR code generation failed: {str(e)}")

    @action(detail=True, methods=['post'], url_path='scan')
    def scan(self, request, pk=None):
        session = self.get_object()
        member = None
        requester_profile = getattr(request.user, 'member_profile', None)

        member_id = request.data.get('member_id')
        if member_id:
            if requester_profile and requester_profile.role == 'admin':
                try:
                    member = Member.objects.get(id=member_id)
                except Member.DoesNotExist:
                    return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'Only admins can specify a member_id'}, status=status.HTTP_403_FORBIDDEN)
        else:
            member = requester_profile

        if not member:
            return Response({'error': 'Could not determine member'}, status=status.HTTP_400_BAD_REQUEST)

        if member.status != 'active':
            return Response({'error': 'Inactive member cannot check in'}, status=status.HTTP_403_FORBIDDEN)

        has_attended_before = AttendanceRecord.objects.filter(member=member).exists()
        is_first = not has_attended_before

        record, created = AttendanceRecord.objects.get_or_create(
            session=session,
            member=member,
            defaults={'is_first_visit': is_first}
        )

        if not created:
            return Response({'message': 'Attendance already recorded'}, status=status.HTTP_200_OK)

        msg = f'First visit recorded for {member}' if is_first else f'Attendance recorded for {member}'
        return Response({'message': msg, 'is_first_visit': is_first}, status=status.HTTP_201_CREATED)


class AttendanceRecordViewSet(BaseMultiTenantViewSet):
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['session', 'member']

    def get_queryset(self):
        queryset = AttendanceRecord.objects.all().order_by('-scanned_at')
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()
            
        profile = getattr(user, 'member_profile', None)
        if not profile:
            return queryset.none()
            
        if profile.role in ['superadmin', 'admin', 'section_leader', 'group_leader']:
            return queryset
        return queryset.filter(member=profile)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]