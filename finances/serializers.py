from rest_framework import serializers
from .models import LedgerAccount, Donation

class LedgerAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerAccount
        fields = '__all__'

class DonationSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    ledger_name = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = '__all__'

    def get_member_name(self, obj):
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}".strip() or obj.member.username
        return None

    def get_ledger_name(self, obj):
        return obj.ledger_account.name if obj.ledger_account else None

