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

LEADER_ROLES = ['superadmin', 'admin', 'section_admin', 'section_leader', 'zone_admin', 'group_leader', 'pta']


def _build_member_verification_payload(member, request):
    full_name = f"{member.first_name or ''} {member.last_name or ''}".strip()
    if not full_name:
        full_name = member.user.username if member.user else f"Member #{member.id}"
    pic_url = None
    pic_rel = None
    if member.profile_picture:
        pic_rel = member.profile_picture.url
        pic_url = request.build_absolute_uri(pic_rel) if request else pic_rel
    return {
        'id': member.id,
        'full_name': full_name,
        'first_name': member.first_name or '',
        'last_name': member.last_name or '',
        'role': member.role or 'member',
        'status': member.status or 'active',
        'section_name': member.section.name if member.section else 'Unassigned Section',
        'zone_name': member.zone.name if member.zone else 'Unassigned Zone',
        'phone_number': member.phone_number or '',
        'email': member.email or '',
        'profile_picture': pic_url,
        'profile_picture_relative': pic_rel,
        'org_name': member.organization.name if member.organization else '',
    }


class AttendanceSessionViewSet(BaseMultiTenantViewSet):
    serializer_class = AttendanceSessionSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return AttendanceSession.objects.none()
        return AttendanceSession.objects.filter(organization=user.member_profile.organization).order_by('-date')

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'verify_member']:
            return [IsAuthenticated()]
        if self.action in ['scan', 'scan_today']:
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

    @action(detail=False, methods=['get'], url_path='verify_member')
    def verify_member(self, request):
        user = request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)

        requester_profile = user.member_profile
        org = requester_profile.organization
        raw_member_id = request.query_params.get('member_id')

        if raw_member_id:
            clean_id = str(raw_member_id).strip()
            if 'MAMS-MEMBER:' in clean_id:
                clean_id = clean_id.split('MAMS-MEMBER:')[-1].strip()
            try:
                member = Member.objects.get(id=int(clean_id), organization=org)
            except (ValueError, Member.DoesNotExist):
                return Response({'error': f'Member #{clean_id} not found in {org.name if org else "organization"}'}, status=status.HTTP_404_NOT_FOUND)
        else:
            member = requester_profile

        return Response({
            'member': _build_member_verification_payload(member, request)
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='scan_today')
    def scan_today(self, request):
        user = request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Response({'error': 'Member profile required'}, status=status.HTTP_403_FORBIDDEN)
        
        requester_profile = user.member_profile
        org = requester_profile.organization
        if not org:
            return Response({'error': 'Organization not found'}, status=status.HTTP_400_BAD_REQUEST)

        member_id = request.data.get('member_id')
        if member_id:
            if requester_profile.role in LEADER_ROLES or str(member_id) == str(requester_profile.id):
                try:
                    member = Member.objects.get(id=member_id, organization=org)
                except Member.DoesNotExist:
                    return Response({'error': 'Member not found in your organization'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'Only admins or section leaders can scan another member'}, status=status.HTTP_403_FORBIDDEN)
        else:
            member = requester_profile

        if member.status != 'active':
            return Response({
                'error': f'{member.first_name} {member.last_name} is currently {member.status} and cannot check in.',
                'member': _build_member_verification_payload(member, request),
            }, status=status.HTTP_403_FORBIDDEN)

        from django.utils import timezone
        now = timezone.localtime(timezone.now())
        today = now.date()
        current_time = now.time()

        # Get all of today's sessions for this org
        todays_sessions = AttendanceSession.objects.filter(organization=org, date=today)

        session = None

        if todays_sessions.exists():
            # 1. Try to find a session whose time window covers right now
            for s in todays_sessions:
                if s.start_time and s.end_time:
                    if s.start_time <= current_time <= s.end_time:
                        session = s
                        break

            # 2. If no time-windowed session matched, check if there is only one session
            #    (with no times set) — use it as a safe fallback
            if not session:
                sessions_without_times = todays_sessions.filter(start_time__isnull=True, end_time__isnull=True)
                if sessions_without_times.count() == 1:
                    session = sessions_without_times.first()
                elif not sessions_without_times.exists() and todays_sessions.count() > 0:
                    # All sessions today have time windows but none matched — between services
                    service_list = ', '.join(
                        f"{s.title} ({s.start_time.strftime('%H:%M')}–{s.end_time.strftime('%H:%M')})"
                        for s in todays_sessions.order_by('start_time')
                    )
                    return Response({
                        'error': 'No active service at this time.',
                        'message': f"No service is currently active. Today's services: {service_list}. Please scan again when your service begins.",
                        'between_services': True,
                        'member': _build_member_verification_payload(member, request),
                    }, status=status.HTTP_400_BAD_REQUEST)

        # 3. No sessions exist at all today — auto-create one
        if not session:
            session = AttendanceSession.objects.create(
                organization=org,
                title=f"Service - {today.strftime('%b %d, %Y')}",
                session_type='church' if getattr(org, 'org_type', 'CHURCH') == 'CHURCH' else 'pta',
                date=today
            )
            try:
                qr_data = f"http://127.0.0.1:3000/scan/{session.id}"
                qr = qrcode.make(qr_data)
                buffer = io.BytesIO()
                qr.save(buffer, format='PNG')
                file_name = f"session_{session.id}.png"
                session.qr_code.save(file_name, ContentFile(buffer.getvalue()), save=True)
            except Exception:
                pass

        # Record attendance
        has_attended_before = AttendanceRecord.objects.filter(member=member).exists()
        is_first = not has_attended_before

        record, created = AttendanceRecord.objects.get_or_create(
            session=session,
            member=member,
            defaults={'is_first_visit': is_first}
        )

        total_attendees = session.records.count()
        member_payload = _build_member_verification_payload(member, request)

        if not created:
            return Response({
                'message': f"{member_payload['full_name']} is already checked in for {session.title}!",
                'session_title': session.title,
                'session_date': str(session.date),
                'already_checked_in': True,
                'total_attendees': total_attendees,
                'member': member_payload,
            }, status=status.HTTP_200_OK)

        msg = (
            f"First visit recorded! Welcome {member_payload['full_name']} to {session.title}"
            if is_first
            else f"Attendance recorded for {member_payload['full_name']} ({session.title})"
        )
        return Response({
            'message': msg,
            'session_title': session.title,
            'session_date': str(session.date),
            'is_first_visit': is_first,
            'total_attendees': total_attendees,
            'member': member_payload,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='scan')
    def scan(self, request, pk=None):
        if pk == 'today':
            return self.scan_today(request)

        session = self.get_object()
        member = None
        requester_profile = getattr(request.user, 'member_profile', None)

        member_id = request.data.get('member_id')
        if member_id:
            if requester_profile and (requester_profile.role in LEADER_ROLES or str(member_id) == str(requester_profile.id)):
                try:
                    member = Member.objects.get(id=member_id, organization=session.organization)
                except Member.DoesNotExist:
                    return Response({'error': 'Member not found in this organization'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'Only admins or section leaders can specify a member_id'}, status=status.HTTP_403_FORBIDDEN)
        else:
            member = requester_profile

        if not member:
            return Response({'error': 'Could not determine member'}, status=status.HTTP_400_BAD_REQUEST)

        member_payload = _build_member_verification_payload(member, request)

        if member.status != 'active':
            return Response({
                'error': f"{member_payload['full_name']} is currently {member.status} and cannot check in.",
                'member': member_payload,
            }, status=status.HTTP_403_FORBIDDEN)

        has_attended_before = AttendanceRecord.objects.filter(member=member).exists()
        is_first = not has_attended_before

        record, created = AttendanceRecord.objects.get_or_create(
            session=session,
            member=member,
            defaults={'is_first_visit': is_first}
        )

        if not created:
            return Response({
                'message': f"{member_payload['full_name']} is already checked in for {session.title}!",
                'session_title': session.title,
                'session_date': str(session.date),
                'already_checked_in': True,
                'member': member_payload,
            }, status=status.HTTP_200_OK)

        msg = (
            f"First visit recorded for {member_payload['full_name']}"
            if is_first
            else f"Attendance recorded for {member_payload['full_name']}"
        )
        return Response({
            'message': msg,
            'session_title': session.title,
            'session_date': str(session.date),
            'is_first_visit': is_first,
            'member': member_payload,
        }, status=status.HTTP_201_CREATED)


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
            
        if profile.role in ['superadmin', 'admin', 'section_leader', 'group_leader', 'pta']:
            return queryset
        return queryset.filter(member=profile)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]