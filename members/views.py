from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Member, Section, Zone, Ministry
from .serializers import MemberSerializer, RegisterMemberSerializer, SectionSerializer, ZoneSerializer, ZoneWithSectionsSerializer, UserSerializer, MinistrySerializer
from .permissions import IsAdmin, IsMember
import requests as http_requests


import re

def geocode_address(address, city='Lusaka', country='Zambia'):
    """Convert a text address to (latitude, longitude) using instant Zambia landmark lookup + fast Nominatim search."""
    if not address or not address.strip():
        return None, None
        
    clean = address.strip()
    
    known_fixes = {
        r'(?i)\brhodespark\b': 'Rhodes Park',
        r'(?i)\bwoodlands\b': 'Woodlands',
        r'(?i)\bchelston\b': 'Chelstone',
        r'(?i)\bkabulonga\b': 'Kabulonga',
        r'(?i)\bavondale\b': 'Avondale',
        r'(?i)\blongacres\b': 'Longacres',
        r'(?i)\bchilenje\b': 'Chilenje',
        r'(?i)\bkamwala\b': 'Kamwala',
        r'(?i)\bmakeni\b': 'Makeni',
        r'(?i)\broma\b': 'Roma',
        r'(?i)\bemmasdale\b': 'Emmasdale',
        r'(?i)\bndeke\b': 'Ndeke',
    }
    
    fixed = clean
    for pat, rep in known_fixes.items():
        fixed = re.sub(pat, rep, fixed)
        
    # Detect city in address if present
    target_city = 'Kitwe' if 'kitwe' in clean.lower() else city
    lower_addr = clean.lower()

    # Extract leading plot/house number if present so different houses on the same road don't overlap on the exact same pixel,
    # while identical house numbers still cluster together at the exact same spot.
    plot_match = re.search(r'(?i)^(?:plot|stand|house|no\.?|h/no\.?)?\s*(\d+)', clean)
    plot_offset_lat = 0.0
    plot_offset_lng = 0.0
    if plot_match:
        plot_num = int(plot_match.group(1))
        # Deterministic ~30m-120m offset along the road based on house/plot number
        plot_offset_lat = (((plot_num * 37) % 21) - 10) * 0.00012
        plot_offset_lng = (((plot_num * 53) % 21) - 10) * 0.00012

    # 1. Instant high-precision lookup for known Zambia streets & suburbs (< 1ms, works offline)
    exact_suburbs_and_roads = [
        ('teak', (-15.4064894, 28.3045635)),
        ('rhodes', (-15.4090, 28.3018)),
        ('unza', (-15.3924, 28.3285)),
        ('university of zambia', (-15.3924, 28.3285)),
        ('handsworth', (-15.3852, 28.3301)),
        ('kalundu', (-15.3802, 28.3238)),
        ('roma', (-15.3688, 28.3168)),
        ('chudleigh', (-15.3672, 28.3375)),
        ('munali', (-15.3765, 28.3422)),
        ('kaunda square', (-15.3712, 28.3510)),
        ('chelston', (-15.3694, 28.3752)),
        ('avondale', (-15.3782, 28.3831)),
        ('mutendere', (-15.3991, 28.3522)),
        ('helen kaunda', (-15.4045, 28.3425)),
        ('kabulonga', (-15.4178, 28.3492)),
        ('ibex', (-15.4242, 28.3685)),
        ('woodlands', (-15.4325, 28.3372)),
        ('chilenje', (-15.4465, 28.3358)),
        ('chalala', (-15.4620, 28.3450)),
        ('longacres', (-15.4148, 28.3135)),
        ('mass media', (-15.4022, 28.3185)),
        ('olympia', (-15.3835, 28.3038)),
        ('northmead', (-15.3992, 28.2935)),
        ('kamwala', (-15.4310, 28.2912)),
        ('makeni', (-15.4632, 28.2580)),
        ('emmasdale', (-15.3915, 28.2730)),
        ('matero', (-15.3762, 28.2610)),
        ('kabanana', (-15.3495, 28.3082)),
        ('chipata compound', (-15.3460, 28.2980)),
        ('phi', (-15.3820, 28.3580)),
        ('presidential housing', (-15.3820, 28.3580)),
        ('salama park', (-15.4050, 28.3740)),
        ('silverest', (-15.3650, 28.4350)),
        ('meanwood', (-15.3420, 28.3580)),
        ('vorna valley', (-15.3510, 28.3480)),
        ('libala', (-15.4380, 28.3180)),
        ('kabwata', (-15.4320, 28.3050)),
        ('chawama', (-15.4580, 28.2880)),
        ('kanyama', (-15.4350, 28.2580)),
        ('thornpark', (-15.3980, 28.2850)),
        ('fairview', (-15.4050, 28.2950)),
        ('cathedral hill', (-15.4180, 28.3020)),
        ('ridgeway', (-15.4240, 28.3080)),
        ('sunningdale', (-15.4150, 28.3350)),
        ('bauleni', (-15.4390, 28.3620)),
        ('lilayi', (-15.4950, 28.2980)),
        ('ndeke', (-12.8285, 28.2320)),
        ('riverside', (-12.8110, 28.2345)),
        ('parklands', (-12.8050, 28.2180)),
        ('wusakile', (-12.8250, 28.2080)),
        ('chimwemwe', (-12.7850, 28.1950)),
        ('nkana', (-12.8150, 28.2120)),
        ('kansenshi', (-12.9480, 28.6280)),
        ('northrise', (-12.9520, 28.6480)),
    ]
    for keyword, coords in exact_suburbs_and_roads:
        if keyword in lower_addr:
            return round(coords[0] + plot_offset_lat, 6), round(coords[1] + plot_offset_lng, 6)

    # 2. Fast online Nominatim lookup for any other street/address (1 single fast query)
    no_plot = re.sub(r'(?i)^(plot|stand|house|no\.?|h/no\.?)?\s*\d+[\w/-]*\s*,?\s*', '', fixed)
    query_str = f"{no_plot or fixed}, {target_city}, {country}"
    headers = {'User-Agent': 'MAMS-Church-App/1.0 (church management system)'}
    try:
        r = http_requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={'q': query_str, 'format': 'json', 'limit': 1},
            headers=headers,
            timeout=(1.5, 2.0)
        )
        data = r.json()
        if data and len(data) > 0:
            return round(float(data[0]['lat']) + plot_offset_lat, 6), round(float(data[0]['lon']) + plot_offset_lng, 6)
    except Exception:
        pass

    # 3. City-level fallback if offline or street not in OpenStreetMap
    lower_with_city = f"{clean} {target_city}".lower()
    city_fallbacks = [
        ('kitwe', (-12.8024, 28.2132)),
        ('ndola', (-12.9587, 28.6366)),
        ('kabwe', (-14.4469, 28.4464)),
        ('chingola', (-12.5289, 27.8838)),
        ('mufulira', (-12.5498, 28.2407)),
        ('livingstone', (-17.8419, 25.8544)),
        ('luanshya', (-13.1367, 28.4166)),
        ('kasama', (-10.2129, 31.1808)),
        ('chipata', (-13.6333, 32.6500)),
        ('solwezi', (-12.1688, 26.3894)),
        ('mansa', (-11.1996, 28.8943)),
        ('mongu', (-15.2484, 23.1274)),
        ('choma', (-16.8089, 26.9875)),
        ('mazabuka', (-15.8560, 27.7480)),
        ('kafue', (-15.7691, 28.1814)),
        ('lusaka', (-15.3875, 28.3228)),
    ]
    for keyword, coords in city_fallbacks:
        if keyword in lower_with_city:
            return coords
            
    return None, None

class SectionViewSet(BaseMultiTenantViewSet):
    serializer_class = SectionSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Section.objects.none()
        return Section.objects.filter(organization=user.member_profile.organization).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

    def get_permissions(self):
        from members.permissions import IsAdmin
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

class ZoneViewSet(BaseMultiTenantViewSet):
    serializer_class = ZoneWithSectionsSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Zone.objects.none()
        return Zone.objects.filter(organization=user.member_profile.organization).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

    def get_permissions(self):
        from members.permissions import IsAdmin
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

class MinistryViewSet(BaseMultiTenantViewSet):
    serializer_class = MinistrySerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return Ministry.objects.none()
        return Ministry.objects.filter(organization=user.member_profile.organization).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.member_profile.organization)

    def get_permissions(self):
        from members.permissions import IsAdmin
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'member_profile', None)
        if not user.is_authenticated or not profile:
            return User.objects.none()
        if profile.role == 'superadmin':
            queryset = User.objects.all()
        elif profile.organization:
            queryset = User.objects.filter(member_profile__organization=profile.organization)
        else:
            return User.objects.none()
        search_email = self.request.query_params.get('search', None)
        if search_email:
            queryset = queryset.filter(email__icontains=search_email)
        return queryset

from rest_framework.pagination import PageNumberPagination

class LargeResultsSetPagination(PageNumberPagination):
    page_size = 1000
    page_size_query_param = 'page_size'
    max_page_size = 10000

from rest_framework import filters

class MemberViewSet(BaseMultiTenantViewSet):
    serializer_class = MemberSerializer
    queryset = Member.objects.all()
    pagination_class = LargeResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']

    def get_queryset(self):
        # BaseMultiTenantViewSet handles the strict isolation to the organization. 
        queryset = super().get_queryset().order_by('-created_at')
        
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)

        if not self.request.user.is_authenticated or not hasattr(self.request.user, 'member_profile'):
            return queryset.none()
            
        profile = self.request.user.member_profile
        
        if profile.role in ['superadmin', 'admin', 'pta']:
            return queryset
        elif profile.role == 'section_admin' and profile.section:
            return queryset.filter(Q(section=profile.section) | Q(role__in=['superadmin', 'admin']))
        elif profile.role == 'zone_admin' and profile.zone:
            return queryset.filter(Q(zone=profile.zone) | Q(role__in=['superadmin', 'admin']))
        elif profile.role == 'group_leader' and profile.ministries.exists():
            return queryset.filter(Q(ministries__in=profile.ministries.all()) | Q(role__in=['superadmin', 'admin'])).distinct()
            
        # Regular member or unassigned leader:
        # Sees themselves + church leadership (Admins/Superadmins) + fellow members in their Section (or Zone)
        q = Q(id=profile.id) | Q(role__in=['superadmin', 'admin'])
        if profile.section:
            q |= Q(section=profile.section)
        elif profile.zone:
            q |= Q(zone=profile.zone)
            
        return queryset.filter(q).distinct()

    def perform_create(self, serializer):
        from django.contrib.auth.models import User
        from django.db import transaction
        
        with transaction.atomic():
            member = serializer.save(
                organization=self.request.user.member_profile.organization,
                is_verified=True,
                is_temporary_password=True
            )
            
            if not member.user:
                email = member.email
                username = email[:150]
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits
                password = ''.join(secrets.choice(alphabet) for _ in range(8))
                
                # Check if user with this email already exists
                user = User.objects.filter(email=email).first()
                if not user:
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        is_active=True,
                        first_name=member.first_name,
                        last_name=member.last_name
                    )
                else:
                    # If user exists (e.g. from incomplete frontend registration), activate them and set default password
                    user.is_active = True
                    user.set_password(password)
                    user.first_name = member.first_name
                    user.last_name = member.last_name
                    user.save()
                    
                member.user = user
                member.save()

                # Send welcome email asynchronously in the background
                try:
                    from mams.email_service import send_email_async
                    org_name = member.organization.name if member.organization else "MAMS"
                    full_name = f"{member.first_name} {member.middle_name or ''} {member.last_name}".replace("  ", " ").strip()
                    send_email_async(
                        subject=f'Welcome to {org_name} - {full_name}',
                        body=f'Hello {full_name} ({email}),\n\nAn administrator has created an account for you at {org_name}.\n\nYour temporary password is: {password}\n\nPlease log in and change your password.\n\nThank you!',
                        recipient_email=email,
                        org_name=org_name,
                    )
                except Exception as e:
                    print(f"Failed to queue welcome email: {e}")

            if member.address and member.latitude is None:
                org_city = member.organization.city.title() if (member.organization and member.organization.city) else 'Lusaka'
                lat, lng = geocode_address(member.address, city=org_city)
                if lat is not None:
                    member.latitude = lat
                    member.longitude = lng
                    member.save(update_fields=['latitude', 'longitude'])

    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        
        profile = getattr(self.request.user, 'member_profile', None)
        
        # Enforce Power Ceiling and Field Restrictions
        if profile and profile.role not in ['superadmin', 'admin']:
            # Regular members cannot change their own role, status, or organization
            for field in ['role', 'status', 'organization', 'is_verified']:
                if field in serializer.validated_data:
                    raise PermissionDenied(f"You do not have permission to change your {field}.")
                    
            if 'role' in serializer.validated_data:
                new_role = serializer.validated_data['role']
                if profile.role == 'zone_admin' and new_role == 'zone_admin':
                    raise PermissionDenied("Zone Leaders cannot assign other Zone Leaders.")
                if profile.role == 'section_admin' and new_role in ['zone_admin', 'section_admin']:
                    raise PermissionDenied("Section Leaders cannot assign Zone or Section Leaders.")
                
        member = serializer.save()
        if member.user:
            member.user.first_name = member.first_name
            member.user.last_name = member.last_name
            member.user.save()
        # Auto-geocode address only if latitude was not explicitly passed
        if 'latitude' in serializer.validated_data:
            if serializer.validated_data.get('latitude') is None:
                member.latitude = None
                member.longitude = None
                member.save(update_fields=['latitude', 'longitude'])
        elif member.address:
            org_city = member.organization.city.title() if (member.organization and member.organization.city) else 'Lusaka'
            lat, lng = geocode_address(member.address, city=org_city)
            if lat is not None:
                member.latitude = lat
                member.longitude = lng
                member.save(update_fields=['latitude', 'longitude'])

    def get_permissions(self):
        from members.permissions import IsHierarchyAuthorized
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update']:
            return [IsHierarchyAuthorized()]
        return [IsAdmin()]

    def perform_destroy(self, instance):
        if instance.user:
            instance.user.delete()
        instance.delete()

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No ids provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        members = self.get_queryset().filter(id__in=ids)
        users = [m.user for m in members if m.user]
        
        # Delete related users first to maintain integrity
        for user in users:
            user.delete()
            
        # Delete members
        deleted_count, _ = members.delete()
        
        return Response({'message': f'Successfully deleted {deleted_count} members.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        member = self.get_object()
        member.status = 'active'
        member.save(update_fields=['status'])
        serializer = self.get_serializer(member)
        return Response({
            'message': f'Member {member.first_name} {member.last_name} approved successfully.',
            'member': serializer.data
        }, status=status.HTTP_200_OK)

from church_profile.models import Organization
from members.permissions import IsSuperAdmin

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    profile = getattr(user, 'member_profile', None)
    
    if not profile:
        return Response({'error': 'Profile not found'}, status=404)
        
    active_session_title = None
    checked_in_today = False
    if profile.organization:
        from django.utils import timezone
        from attendance.models import AttendanceSession, AttendanceRecord
        today = timezone.localdate()
        today_session = AttendanceSession.objects.filter(
            organization=profile.organization,
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
            checked_in_today = AttendanceRecord.objects.filter(
                session=today_session,
                member=profile,
            ).exists()

    return Response({
        'username': user.username,
        'role': profile.role,
        'user_id': user.id,
        'member_id': profile.id,
        'first_name': profile.first_name,
        'middle_name': profile.middle_name,
        'last_name': profile.last_name,
        'phone_number': profile.phone_number,
        'email': profile.email,
        'gender': profile.gender,
        'address': profile.address,
        'latitude': profile.latitude,
        'longitude': profile.longitude,
        'status': profile.status,
        'profile_picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
        'is_temporary_password': profile.is_temporary_password,
        'org_name': profile.organization.name if profile.organization else '',
        'org_code': profile.organization.org_code if profile.organization else '',
        'org_type': profile.organization.org_type if profile.organization else 'CHURCH',
        'org_city': profile.organization.city if profile.organization else 'LUSAKA',
        'section_name': profile.section.name if profile.section else 'Unassigned Section',
        'zone_name': profile.zone.name if profile.zone else 'Unassigned Zone',
        'active_session_title': active_session_title,
        'checked_in_today': checked_in_today,
    })

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

@api_view(['POST', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_my_profile(request):
    user = request.user
    profile = getattr(user, 'member_profile', None)
    if not profile:
        return Response({'error': 'Profile not found'}, status=404)

    # Update User fields if provided
    if 'first_name' in request.data:
        user.first_name = request.data['first_name']
        profile.first_name = request.data['first_name']
    if 'middle_name' in request.data:
        profile.middle_name = request.data['middle_name']
    if 'last_name' in request.data:
        user.last_name = request.data['last_name']
        profile.last_name = request.data['last_name']
    user.save()

    # Update Profile fields
    if 'phone_number' in request.data: profile.phone_number = request.data['phone_number']
    if 'gender' in request.data: profile.gender = request.data['gender']
    if 'address' in request.data: profile.address = request.data['address']
    
    if 'latitude' in request.data:
        lat_val = request.data['latitude']
        profile.latitude = float(lat_val) if lat_val not in [None, '', 'null'] else None
    if 'longitude' in request.data:
        lng_val = request.data['longitude']
        profile.longitude = float(lng_val) if lng_val not in [None, '', 'null'] else None
        
    # Auto-geocode address if latitude was not explicitly passed in this request
    if 'latitude' not in request.data and 'address' in request.data and profile.address:
        org_city = profile.organization.city.title() if (profile.organization and profile.organization.city) else 'Lusaka'
        lat, lng = geocode_address(profile.address, city=org_city)
        if lat is not None:
            profile.latitude = lat
            profile.longitude = lng
    
    if 'profile_picture' in request.FILES:
        profile.profile_picture = request.FILES['profile_picture']
    elif request.data.get('remove_picture') == 'true':
        profile.profile_picture = None

    profile.save()

    return Response({
        'message': 'Profile updated successfully',
        'latitude': profile.latitude,
        'longitude': profile.longitude,
        'address': profile.address,
        'profile_picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    password = request.data.get('password')
    if not password:
        return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(password)
    user.save()
    
    if hasattr(user, 'member_profile'):
        profile = user.member_profile
        profile.is_temporary_password = False
        profile.save()
        
    return Response({'message': 'Password updated successfully'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def create_local_admin(request):
    try:
        from django.contrib.auth.models import User
        from django.db import transaction
        from .models import Member
        
        org_id = request.data.get('organization_id')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        
        if not all([org_id, first_name, last_name, email, phone_number]):
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        org = Organization.objects.get(id=org_id)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            user = User.objects.create_user(
                username=email[:150],
                email=email,
                password='password123',
                first_name=first_name,
                last_name=last_name,
                is_active=True
            )
            
            member = Member.objects.create(
                user=user,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone_number,
                role='admin',
                status='active',
                organization=org,
                is_verified=True,
                is_temporary_password=True
            )
            
        return Response({'message': 'Local admin created successfully. Password is password123.'}, status=status.HTTP_201_CREATED)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_member(request):
    import json
    payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    raw_ministries = payload.get('ministries')
    if isinstance(raw_ministries, str):
        raw_str = raw_ministries.strip()
        if raw_str.startswith('['):
            try:
                parsed = json.loads(raw_str)
                if hasattr(payload, 'setlist'):
                    payload.setlist('ministries', [int(x) for x in parsed if str(x).isdigit()])
                else:
                    payload['ministries'] = [int(x) for x in parsed if str(x).isdigit()]
            except Exception:
                pass
        elif raw_str:
            ids = [int(x.strip()) for x in raw_str.split(',') if x.strip().isdigit()]
            if hasattr(payload, 'setlist'):
                payload.setlist('ministries', ids)
            else:
                payload['ministries'] = ids
        else:
            payload.pop('ministries', None)

    serializer = RegisterMemberSerializer(data=payload)
    if serializer.is_valid():
        member = serializer.save()
        # Auto-geocode address if provided and not already explicitly set
        address = serializer.validated_data.get('address', '')
        if address and member.latitude is None:
            lat, lng = geocode_address(address)
            if lat is not None:
                Member.objects.filter(id=member.id).update(latitude=lat, longitude=lng)
        return Response({
            'message': 'Registration successful. Please verify your email.',
            'member': MemberSerializer(member).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

import random
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        member = Member.objects.get(email=email)
        user = member.user
        
        if member.is_verified:
            return Response({'message': 'Account is already verified'}, status=status.HTTP_200_OK)
            
        if member.otp_code != otp:
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check expiration (15 minutes)
        if member.otp_created_at and timezone.now() > member.otp_created_at + timedelta(minutes=15):
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Verify
        member.is_verified = True
        member.otp_code = None
        member.save()
        
        if user:
            user.is_active = True
            user.save()
            
        return Response({'message': 'Email verified successfully! You can now log in.'}, status=status.HTTP_200_OK)
        
    except Member.DoesNotExist:
        return Response({'error': 'User with this email not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    email = request.data.get('email')
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        member = Member.objects.get(email=email)
        
        if member.is_verified:
            return Response({'message': 'Account is already verified'}, status=status.HTTP_200_OK)
            
        otp = str(random.randint(100000, 999999))
        member.otp_code = otp
        member.otp_created_at = timezone.now()
        member.save()
        
        # Print to terminal for testing/fallback
        print(f"==================================================")
        print(f"MAMS NEW VERIFICATION CODE FOR {email}: {otp}")
        print(f"==================================================")
        
        try:
            from mams.email_service import send_email_async
            org_name = member.organization.name if (member.organization and member.organization.name) else "MAMS"
            full_name = f"{member.first_name} {member.middle_name or ''} {member.last_name}".replace("  ", " ").strip()
            send_email_async(
                subject=f'Your New {org_name} Verification Code - {full_name}',
                body=f'Hello {full_name} ({email}),\n\nYour new verification code for {org_name} is: {otp}\n\nThis code will expire in 15 minutes.\n\nThank you!',
                recipient_email=email,
                org_name=org_name,
            )
        except Exception as e:
            print(f"Failed to queue email: {e}")
            
        return Response({'message': 'A new verification code has been sent to your email.'}, status=status.HTTP_200_OK)
        
    except Member.DoesNotExist:
        return Response({'error': 'User with this email not found'}, status=status.HTTP_404_NOT_FOUND)
@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        member = Member.objects.get(email=email)
        if not member.user:
            return Response({'error': 'Account not fully set up. Contact administrator.'}, status=status.HTTP_400_BAD_REQUEST)
            
        otp = str(random.randint(100000, 999999))
        member.otp_code = otp
        member.otp_created_at = timezone.now()
        member.save()
        
        print(f"==================================================")
        print(f"MAMS PASSWORD RESET CODE FOR {email}: {otp}")
        print(f"==================================================")
        
        try:
            from mams.email_service import send_email_async
            org_name = member.organization.name if (member.organization and member.organization.name) else "MAMS"
            full_name = f"{member.first_name} {member.middle_name or ''} {member.last_name}".replace("  ", " ").strip()
            send_email_async(
                subject=f'Your {org_name} Password Reset Code - {full_name}',
                body=f'Hello {full_name} ({email}),\n\nYour password reset code for {org_name} is: {otp}\n\nThis code will expire in 15 minutes.\n\nThank you!',
                recipient_email=email,
                org_name=org_name,
            )
        except Exception as e:
            print(f"Failed to queue email: {e}")
            
        return Response({'message': 'A password reset code has been sent to your email.'}, status=status.HTTP_200_OK)
        
    except Member.DoesNotExist:
        # Don't reveal if email exists or not to prevent enumeration
        return Response({'message': 'If an account with that email exists, a reset code has been sent.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    email = request.data.get('email')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('password')
    
    if not all([email, otp_code, new_password]):
        return Response({'error': 'Email, OTP code, and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        member = Member.objects.get(email=email)
        
        if not member.otp_code or member.otp_code != otp_code:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check expiry (15 mins)
        if member.otp_created_at:
            time_diff = timezone.now() - member.otp_created_at
            if time_diff.total_seconds() > 900:  # 15 minutes
                return Response({'error': 'Verification code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if member.user:
            member.user.set_password(new_password)
            member.user.save()
            
            member.is_temporary_password = False
            member.otp_code = None
            member.save()
            
            return Response({'message': 'Password has been successfully reset. You can now log in.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Account is not linked to a user.'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Member.DoesNotExist:
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)