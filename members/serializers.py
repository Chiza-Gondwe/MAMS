from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Member, Section, Zone, Ministry
from church_profile.models import Organization

class ZoneSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    
    class Meta:
        model = Zone
        fields = '__all__'

class SectionSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    zone_details = ZoneSerializer(source='zone', read_only=True)
    
    class Meta:
        model = Section
        fields = '__all__'

class ZoneWithSectionsSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    sections = SectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Zone
        fields = '__all__'

class MinistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Ministry
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class MemberSerializer(serializers.ModelSerializer):
    ministries_details = MinistrySerializer(source='ministries', many=True, read_only=True)
    section_name = serializers.SerializerMethodField()
    zone_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Member
        fields = '__all__'

    def get_section_name(self, obj):
        return obj.section.name if obj.section else None

    def get_zone_name(self, obj):
        return obj.zone.name if obj.zone else None

from django.db import transaction

import random
from django.utils import timezone
from django.core.mail import send_mail

from django.conf import settings

class RegisterMemberSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    ministries = serializers.PrimaryKeyRelatedField(
        queryset=Ministry.objects.all(), 
        many=True, 
        required=False
    )
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(), 
        source='section',
        required=False,
        allow_null=True
    )
    zone_id = serializers.PrimaryKeyRelatedField(
        queryset=Zone.objects.all(), 
        source='zone',
        required=False,
        allow_null=True
    )

    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=True
    )

    class Meta:
        model = Member
        fields = [
            'first_name', 'middle_name', 'last_name', 'email',
            'phone_number', 'address', 'role', 'status', 'gender', 'password', 'ministries', 'section_id', 'zone_id', 'organization',
            'profile_picture', 'latitude', 'longitude'
        ]
        # Public self-registration must never choose its own role or status
        read_only_fields = ['role', 'status']
        extra_kwargs = {
            'middle_name': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        ministries = validated_data.pop('ministries', [])
        organization = validated_data.pop('organization', None)
        validated_data.pop('role', None)
        validated_data.pop('status', None)
        selected_section = validated_data.get('section')
        if selected_section and not validated_data.get('zone') and getattr(selected_section, 'zone', None):
            validated_data['zone'] = selected_section.zone
        status_val = 'active' if selected_section else 'pending_review'
        
        with transaction.atomic():
            email = validated_data['email']
            username = email[:150]
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=False,
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', '')
            )
            
            otp = str(random.randint(100000, 999999))
            
            # Default to member status, or pending_review depending on the rules, but user wants them separated from admin tasks
            member = Member.objects.create(
                user=user, 
                is_verified=False,
                otp_code=otp,
                otp_created_at=timezone.now(),
                organization=organization,
                role='member',
                status=status_val,
                **validated_data
            )
            
            if ministries:
                member.ministries.set(ministries)
            
            # Print to terminal for testing/fallback
            print(f"==================================================")
            print(f"MAMS VERIFICATION CODE FOR {email}: {otp}")
            print(f"==================================================")

        # Dispatch email asynchronously AFTER DB transaction commits so registration never hangs
        from mams.email_service import send_email_async
        org_name = organization.name if organization else "MAMS"
        full_name = " ".join(p for p in [member.first_name, member.middle_name, member.last_name] if p).strip() or member.first_name
        send_email_async(
            subject=f"Verify Your {org_name} Account - {full_name}",
            body=(
                f"Hello {full_name} ({email}),\n\n"
                f"Your verification code for {org_name} is: {otp}\n\n"
                f"This code will expire in 15 minutes.\n\n"
                f"Thank you!"
            ),
            recipient_email=email,
            org_name=org_name,
        )

        return member
