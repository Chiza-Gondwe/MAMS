from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Organization
from .serializers import OrganizationSerializer
from members.permissions import IsAdmin

class OrganizationViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = OrganizationSerializer
    
    def get_queryset(self):
        return Organization.objects.all()

    def get_object(self):
        return self.request.user.member_profile.organization

    def get_permissions(self):
        return [IsAdmin()]

from members.permissions import IsSuperAdmin

class SuperadminOrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by('-id')
    serializer_class = OrganizationSerializer
    permission_classes = [IsSuperAdmin]

class PublicChurchViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='verify-code')
    def verify_code(self, request):
        org_code = request.query_params.get('code')
        if not org_code:
            return Response({'error': 'Organization code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            org = Organization.objects.get(org_code__iexact=org_code)
            # Fetch related zones, sections, ministries
            from members.models import Zone, Section, Ministry
            from members.serializers import ZoneSerializer, SectionSerializer, MinistrySerializer
            
            zones = Zone.objects.filter(organization=org)
            sections = Section.objects.filter(organization=org)
            ministries = Ministry.objects.filter(organization=org)
            
            return Response({
                'organization': OrganizationSerializer(org).data,
                'zones': ZoneSerializer(zones, many=True).data,
                'sections': SectionSerializer(sections, many=True).data,
                'ministries': MinistrySerializer(ministries, many=True).data
            })
        except Organization.DoesNotExist:
            return Response({'error': 'Invalid organization code'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='register')
    def register_church(self, request):
        from django.contrib.auth.models import User
        from members.models import Member
        from django.db import transaction
        import uuid
        
        church_name = request.data.get('church_name')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        password = request.data.get('password')
        phone = request.data.get('phone', '')
        
        if not all([church_name, first_name, last_name, email, password]):
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                # Generate unique org code (first 3 letters of church name + random code)
                prefix = church_name.upper().replace(' ', '')[:3]
                if len(prefix) < 3:
                    prefix = prefix.ljust(3, 'X')
                random_part = str(uuid.uuid4().hex)[:6].upper()
                org_code = f"{prefix}-C-{random_part}"
                
                # Create Church
                org = Organization.objects.create(
                    name=church_name,
                    org_code=org_code,
                    address='',
                    contact_phone=phone,
                    contact_email=email
                )
                
                # Create User (Pastor)
                user = User.objects.create_user(
                    username=email[:150],
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True
                )
                
                # Create Member (Admin role)
                member = Member.objects.create(
                    user=user,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    phone_number=phone,
                    role='admin',
                    status='active',
                    organization=org,
                    is_verified=True # Auto-verify the creator
                )
                
            return Response({
                'message': 'Church registered successfully.',
                'org_code': org_code,
                'organization': OrganizationSerializer(org).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from members.models import Member
from attendance.models import AttendanceSession
from finances.models import Donation

class AnalyticsAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        church = request.user.member_profile.organization
        
        # Demographics
        members = Member.objects.filter(organization=church)
        active_count = members.filter(status='active').count()
        inactive_count = members.filter(status='inactive').count()
        visitors_count = members.filter(status='visitor').count()
        demographics = [
            {'name': 'Active', 'value': active_count},
            {'name': 'Inactive', 'value': inactive_count},
            {'name': 'Visitors', 'value': visitors_count}
        ]
        
        one_year_ago = timezone.now() - timedelta(days=365)
        
        # Attendance trend
        attendance_trend = AttendanceSession.objects.filter(organization=church, date__gte=one_year_ago) \
            .annotate(month=TruncMonth('date')) \
            .values('month') \
            .annotate(count=Count('records')) \
            .order_by('month')
            
        formatted_attendance = []
        for a in attendance_trend:
            if a['month']:
                formatted_attendance.append({
                    'month': a['month'].strftime('%b %Y'),
                    'attendance': a['count']
                })
            
        # Financial trend
        donations_trend = Donation.objects.filter(organization=church, date__gte=one_year_ago) \
            .annotate(month=TruncMonth('date')) \
            .values('month') \
            .annotate(total=Sum('amount')) \
            .order_by('month')
            
        formatted_finances = []
        for f in donations_trend:
            if f['month']:
                formatted_finances.append({
                    'month': f['month'].strftime('%b %Y'),
                    'amount': float(f['total'])
                })
            
        return Response({
            'demographics': demographics,
            'attendance_trend': formatted_attendance,
            'financial_trend': formatted_finances
        })
