from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Organization
from .serializers import OrganizationSerializer, PublicOrganizationSerializer
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

    def perform_destroy(self, instance):
        from django.contrib.auth.models import User
        user_ids = list(instance.members.exclude(user__isnull=True).values_list('user_id', flat=True))
        instance.delete()
        if user_ids:
            User.objects.filter(id__in=user_ids).delete()

class PublicChurchViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Organization.objects.all()
    serializer_class = PublicOrganizationSerializer
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
                'organization': PublicOrganizationSerializer(org).data,
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
        first_name = (request.data.get('first_name') or '').strip()
        middle_name = (request.data.get('middle_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        email = (request.data.get('email') or '').strip()
        password = request.data.get('password')
        phone = (request.data.get('phone') or '').strip()
        gender = (request.data.get('gender') or '').strip().upper()
        city = (request.data.get('city') or 'LUSAKA').strip().upper()
        
        if not all([church_name, first_name, last_name, email, phone, password]):
            return Response({'error': 'Organization name, first name, last name, email, phone number, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                org_type = request.data.get('org_type', 'CHURCH')
                # Generate unique org code using City + Org Type + random code
                city_prefix = city.replace(' ', '')[:3].upper() if city else 'LUS'
                type_initial = org_type[0].upper() if org_type else 'C'
                random_part = str(uuid.uuid4().hex)[:6].upper()
                org_code = f"{city_prefix}-{type_initial}-{random_part}"
                
                # Create Organization
                org = Organization.objects.create(
                    name=church_name,
                    org_code=org_code,
                    org_type=org_type,
                    city=city,
                    address=city.title(),
                    phone=phone,
                    email=email
                )
                
                # Create User (Admin)
                user = User.objects.create_user(
                    username=email[:150],
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True
                )
                
                # Create Member (Admin role)
                Member.objects.create(
                    user=user,
                    first_name=first_name,
                    middle_name=middle_name,
                    last_name=last_name,
                    email=email,
                    phone_number=phone,
                    gender=gender if gender in ('M', 'F') else None,
                    role='admin',
                    status='active',
                    organization=org,
                    is_verified=True
                )
                
            return Response({
                'message': 'Organization registered successfully.',
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

class MobileDashboardAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        if not hasattr(request.user, 'member_profile'):
            return Response({'error': 'No profile found'}, status=400)
            
        org = request.user.member_profile.organization
        
        total_members = Member.objects.filter(organization=org, status='active').count()
        pending_members = Member.objects.filter(organization=org, status='pending_review').count()
        
        # Calculate total contributions this month (fallback to all-time completed if 0 this month)
        from django.db.models import Sum
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        contributions = Donation.objects.filter(
            organization=org, 
            status='COMPLETED',
            created_at__gte=start_of_month
        ).aggregate(total=Sum('amount'))['total']
        if not contributions:
            contributions = Donation.objects.filter(
                organization=org,
                status='COMPLETED',
            ).aggregate(total=Sum('amount'))['total'] or 0

        active_session_title = None
        today = timezone.localdate()
        today_session = AttendanceSession.objects.filter(
            organization=org,
            date=today,
        ).order_by('-id').first()
        if today_session:
            if today_session.start_time and today_session.end_time:
                st = today_session.start_time.strftime('%H:%M')
                et = today_session.end_time.strftime('%H:%M')
                active_session_title = f"{today_session.title} ({st} - {et})"
            elif today_session.start_time:
                st = today_session.start_time.strftime('%H:%M')
                active_session_title = f"{today_session.title} ({st})"
            else:
                active_session_title = today_session.title

        from .ai_engine import compute_ai_insights
        ai_insights = compute_ai_insights(org, request)

        return Response({
            'total_members': total_members,
            'pending_members': pending_members,
            'monthly_contributions': contributions,
            'active_session_title': active_session_title,
            'org_code': org.org_code if org else '',
            'org_name': org.name if org else '',
            'org_type': org.org_type if org else 'CHURCH',
            'ai_insights': ai_insights,
        })

class AnalyticsAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        church = request.user.member_profile.organization
        
        # Demographics
        members = Member.objects.filter(organization=church)
        male_count = members.filter(gender='M').count()
        female_count = members.filter(gender='F').count()
        unspecified_count = members.exclude(gender__in=['M', 'F']).count()
        
        demographics = [
            {'name': 'Male', 'value': male_count},
            {'name': 'Female', 'value': female_count},
        ]
        
        if unspecified_count > 0:
            demographics.append({'name': 'Not Specified', 'value': unspecified_count})
        
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

        from .ai_engine import compute_ai_insights
        ai_insights = compute_ai_insights(church, request)
            
        return Response({
            'demographics': demographics,
            'attendance_trend': formatted_attendance,
            'financial_trend': formatted_finances,
            'ai_insights': ai_insights,
        })
