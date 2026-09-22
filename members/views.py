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
    """Convert a text address to (latitude, longitude) using smart progressive Nominatim search."""
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
    
    candidates = []
    candidates.append(fixed)
    candidates.append(f"{fixed}, {target_city}, {country}")
    
    # Strip leading plot/house numbers e.g. 4148, Plot 12, Stand 44
    no_plot = re.sub(r'(?i)^(plot|stand|house|no\.?|h/no\.?)?\s*\d+[\w/-]*\s*,?\s*', '', fixed)
    if no_plot and no_plot != fixed:
        candidates.append(no_plot)
        candidates.append(f"{no_plot}, {target_city}, {country}")
        
    # Extract road name + area if present (e.g. 'Teak rd Rhodes Park')
    road_match = re.search(r'(?i)(\w+\s*(?:rd|road|street|st|ave|avenue|way|lane|close|cres|drive|dr))\b', fixed)
    if road_match:
        road = road_match.group(1)
        candidates.append(f"{road}, {target_city}, {country}")
        candidates.append(f"{road}, {country}")
        
    for pat, rep in known_fixes.items():
        if re.search(pat, clean):
            candidates.append(f"{rep}, {target_city}, {country}")
            candidates.append(f"{rep}, {country}")
            
    headers = {'User-Agent': 'MAMS-Church-App/1.0 (church management system)'}
    
    for q in candidates:
        try:
            r = http_requests.get(
                'https://nominatim.openstreetmap.org/search',
                params={'q': q, 'format': 'json', 'limit': 1},
                headers=headers,
                timeout=5
            )
            data = r.json()
            if data and len(data) > 0:
                return float(data[0]['lat']), float(data[0]['lon'])
        except Exception:
            continue
            
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
        queryset = User.objects.all()
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
                password = "password123"
                
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

                # Send welcome email
                try:
                    from django.core.mail import send_mail
                    org_name = member.organization.name if member.organization else "MAMS"
                    send_mail(
                        subject=f'Welcome to {org_name}',
                        message=f'Hello {member.first_name},\n\nAn administrator has created an account for you at {org_name}.\n\nYour temporary password is: {password}\n\nPlease log in and change your password.\n\nThank you!',
                        from_email='noreply@mams.local',
                        recipient_list=[email],
                        fail_silently=True,
                    )
                except Exception as e:
                    print(f"Failed to send welcome email: {e}")

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
                Member.objects.filter(id=member.id).update(latitude=None, longitude=None)
        elif 'address' in serializer.validated_data and member.address:
            lat, lng = geocode_address(member.address)
            if lat is not None:
                Member.objects.filter(id=member.id).update(latitude=lat, longitude=lng)

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

from church_profile.models import Organization
from members.permissions import IsSuperAdmin

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    profile = getattr(user, 'member_profile', None)
    
    if not profile:
        return Response({'error': 'Profile not found'}, status=404)
        
    return Response({
        'username': user.username,
        'role': profile.role,
        'user_id': user.id,
        'member_id': profile.id,
        'first_name': profile.first_name,
        'last_name': profile.last_name,
        'phone_number': profile.phone_number,
        'email': profile.email,
        'gender': profile.gender,
        'address': profile.address,
        'status': profile.status,
        'profile_picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
        'is_temporary_password': profile.is_temporary_password,
        'org_name': profile.organization.name if profile.organization else '',
        'org_type': profile.organization.org_type if profile.organization else 'CHURCH'
    })

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

@api_view(['POST', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_my_profile(request):
    user = request.user
    profile = getattr(user, 'member_profile', None)
    if not profile:
        return Response({'error': 'Profile not found'}, status=404)

    # Allow multipart parser for this specific function since api_view doesn't easily let us set parsers
    # DRF handles request.data merging request.POST and request.FILES

    # Update User fields if provided
    if 'first_name' in request.data:
        user.first_name = request.data['first_name']
        profile.first_name = request.data['first_name']
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
        lat, lng = geocode_address(profile.address)
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
    serializer = RegisterMemberSerializer(data=request.data)
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
            send_mail(
                subject='Your New MAMS Verification Code',
                message=f'Hello {member.first_name},\n\nYour new MAMS verification code is: {otp}\n\nThis code will expire in 15 minutes.\n\nThank you!',
                from_email='noreply@mams.local',
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            
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
            send_mail(
                subject='Your MAMS Password Reset Code',
                message=f'Hello {member.first_name},\n\nYour MAMS password reset code is: {otp}\n\nThis code will expire in 15 minutes.\n\nThank you!',
                from_email='noreply@mams.local',
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            
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