import qrcode
import io
import base64
from django.core.files.base import ContentFile
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AttendanceSession, AttendanceRecord
from .serializers import AttendanceSessionSerializer, AttendanceRecordSerializer
from members.models import Member

class AttendanceSessionViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSession.objects.all()
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        session = serializer.save()
        # Auto-generate QR code when session is created
        qr_data = f"MAMS-SESSION-{session.id}"
        qr = qrcode.make(qr_data)
        buffer = io.BytesIO()
        qr.save(buffer, format='PNG')
        file_name = f"session_{session.id}.png"
        session.qr_code.save(file_name, ContentFile(buffer.getvalue()), save=True)

    @action(detail=True, methods=['post'], url_path='scan')
    def scan(self, request, pk=None):
        session = self.get_object()
        member_id = request.data.get('member_id')

        if not member_id:
            return Response({'error': 'member_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = Member.objects.get(id=member_id)
        except Member.DoesNotExist:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)

        record, created = AttendanceRecord.objects.get_or_create(
            session=session,
            member=member
        )

        if not created:
            return Response({'message': 'Attendance already recorded'}, status=status.HTTP_200_OK)

        return Response({'message': f'Attendance recorded for {member}'}, status=status.HTTP_201_CREATED)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]