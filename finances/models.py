from django.db import models
from members.models import Member

class LedgerAccount(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='ledger_accounts', null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Donation(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='donations', null=True, blank=True)
    ledger_account = models.ForeignKey(LedgerAccount, on_delete=models.SET_NULL, null=True, related_name='donations')
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name='donations')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    service_type = models.CharField(max_length=255, default='Regular Service')
    session = models.CharField(max_length=100, default='Morning')
    status = models.CharField(max_length=50, default='Completed')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.service_type} - {self.amount}"
