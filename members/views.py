from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Member, Section, Zone, Ministry
from .serializers import MemberSerializer, RegisterMemberSerializer, SectionSerializer, ZoneSerializer, ZoneWithSectionsSerializer, UserSerializer, MinistrySerializer
from .permissions import IsAdmin, IsMember

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
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

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
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

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
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

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
        
        if not self.request.user.is_authenticated or not hasattr(self.request.user, 'member_profile'):
            return queryset.none()
            
        profile = self.request.user.member_profile
        
        if profile.role in ['superadmin', 'admin', 'pta']:
            return queryset
        elif profile.role == 'section_admin' and profile.section:
            return queryset.filter(section=profile.section)
        elif profile.role == 'zone_admin' and profile.zone:
            return queryset.filter(zone=profile.zone)
        elif profile.role == 'group_leader' and profile.ministries.exists():
            return queryset.filter(ministries__in=profile.ministries.all()).distinct()
            
        # If regular member or unassigned leader, only see themselves
        return queryset.filter(id=profile.id)

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
        member = serializer.save()
        if member.user:
            member.user.first_name = member.first_name
            member.user.last_name = member.last_name
            member.user.save()

    def get_permissions(self):
        from members.permissions import IsAdminOrSelf
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update']:
            return [IsAdminOrSelf()]
        return [IsAdmin()]

from church_profile.models import Organization
from members.permissions import IsSuperAdmin

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