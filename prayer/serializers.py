from rest_framework import serializers
from .models import PrayerRequest
from members.serializers import MemberSerializer

class PrayerRequestSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = PrayerRequest
        fields = '__all__'
        read_only_fields = ['church', 'member', 'created_at', 'updated_at']

    def get_member_name(self, obj):
        if obj.is_anonymous or not obj.member:
            return "Anonymous"
        return f"{obj.member.first_name} {obj.member.last_name}"
