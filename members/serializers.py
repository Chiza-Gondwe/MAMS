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
            'first_name', 'last_name', 'email',
            'phone_number', 'role', 'status', 'gender', 'password', 'ministries', 'section_id', 'zone_id', 'organization',
            'profile_picture', 'latitude', 'longitude'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        ministries = validated_data.pop('ministries', [])
        organization = validated_data.pop('organization', None)
        status_val = validated_data.pop('status', 'pending_review')
        
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
                status=status_val,
                **validated_data
            )
            
            if ministries:
                member.ministries.set(ministries)
            
            # Print to terminal for testing/fallback
            print(f"==================================================")
            print(f"MAMS VERIFICATION CODE FOR {email}: {otp}")
            print(f"==================================================")
            
            # Send Email
            try:
                send_mail(
                    subject='Verify Your MAMS Account',
                    message=f'Hello {member.first_name},\n\nYour MAMS verification code is: {otp}\n\nThis code will expire in 15 minutes.\n\nThank you!',
                    from_email='noreply@mams.local',
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed to send email: {e}")
                
        return member