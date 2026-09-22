from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord

class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = ['id', 'organization', 'title', 'session_type', 'date', 'start_time', 'end_time', 'qr_code', 'created_at']
        read_only_fields = ['organization', 'qr_code', 'created_at']

class AttendanceRecordSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    session_title = serializers.CharField(source='session.title', read_only=True)
    session_date = serializers.DateField(source='session.date', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'session', 'member', 'scanned_at', 'is_first_visit', 'member_name', 'session_title', 'session_date']

    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"