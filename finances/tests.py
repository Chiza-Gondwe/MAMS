from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from church_profile.models import Organization
from members.models import Member
from finances.models import LedgerAccount, Donation


class FinancesAPITest(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Church", org_type="CHURCH", city="LUSAKA")
        self.other_org = Organization.objects.create(name="Other Church", org_type="CHURCH", city="NDOLA")

        self.admin_user = User.objects.create_user(username='admin@example.com', email='admin@example.com', password='password123')
        self.admin_member = Member.objects.create(
            user=self.admin_user, first_name='Admin', last_name='User',
            email='admin@example.com', phone_number='0971111111', role='admin',
            organization=self.org
        )

        self.member_user1 = User.objects.create_user(username='m1@example.com', email='m1@example.com', password='password123')
        self.member1 = Member.objects.create(
            user=self.member_user1, first_name='Member', last_name='One',
            email='m1@example.com', phone_number='0972222222', role='member',
            organization=self.org
        )

        self.member_user2 = User.objects.create_user(username='m2@example.com', email='m2@example.com', password='password123')
        self.member2 = Member.objects.create(
            user=self.member_user2, first_name='Member', last_name='Two',
            email='m2@example.com', phone_number='0973333333', role='member',
            organization=self.org
        )

        self.ledger = LedgerAccount.objects.create(name='Tithes', organization=self.org)
        self.donation1 = Donation.objects.create(
            organization=self.org, member=self.member1, ledger_account=self.ledger,
            amount=500.00, date='2026-06-01', status='COMPLETED'
        )
        self.donation2 = Donation.objects.create(
            organization=self.org, member=self.member2, ledger_account=self.ledger,
            amount=1200.00, date='2026-06-01', status='COMPLETED'
        )

    def test_regular_member_sees_only_own_donations(self):
        self.client.force_authenticate(user=self.member_user1)
        response = self.client.get(reverse('donation-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.donation1.id)

    def test_admin_sees_all_organization_donations(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('donation-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

    def test_regular_member_cannot_create_donation_or_ledger(self):
        self.client.force_authenticate(user=self.member_user1)
        res_ledger = self.client.post(reverse('ledgeraccount-list'), {'name': 'Building Fund'})
        self.assertEqual(res_ledger.status_code, status.HTTP_403_FORBIDDEN)

        res_donation = self.client.post(reverse('donation-list'), {
            'member': self.member1.id,
            'ledger_account': self.ledger.id,
            'amount': '200.00',
            'date': '2026-06-02',
            'status': 'COMPLETED'
        })
        self.assertEqual(res_donation.status_code, status.HTTP_403_FORBIDDEN)
