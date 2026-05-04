from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Member

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'

class RegisterMemberSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Member
        fields = [
            'first_name', 'last_name', 'email',
            'phone_number', 'role', 'status', 'password'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=password
        )
        member = Member.objects.create(user=user, **validated_data)
        return member