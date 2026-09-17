from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord

class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = '__all__'

class AttendanceRecordSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'session', 'member', 'scanned_at', 'member_name']

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"