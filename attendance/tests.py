from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from church_profile.models import Organization
from members.models import Member
from attendance.models import AttendanceSession, AttendanceRecord

class AttendanceSessionAPITest(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Church", org_type="CHURCH", city="LUSAKA")
        # Create users & members
        self.admin_user = User.objects.create_user(username='admin@example.com', email='admin@example.com', password='password123')
        self.admin_member = Member.objects.create(
            user=self.admin_user, first_name='Admin', last_name='User',
            email='admin@example.com', phone_number='0971111111', role='admin',
            organization=self.org
        )

        self.member_user = User.objects.create_user(username='member@example.com', email='member@example.com', password='password123')
        self.member_member = Member.objects.create(
            user=self.member_user, first_name='Regular', last_name='Member',
            email='member@example.com', phone_number='0973333333', role='member',
            organization=self.org
        )

        self.inactive_user = User.objects.create_user(username='inactive@example.com', email='inactive@example.com', password='password123')
        self.inactive_member = Member.objects.create(
            user=self.inactive_user, first_name='Inactive', last_name='Member',
            email='inactive@example.com', phone_number='0974444444', role='member', status='inactive',
            organization=self.org
        )

        # Create a session
        self.session = AttendanceSession.objects.create(
            title='Sunday Morning Service',
            session_type='church',
            date=timezone.now().date(),
            organization=self.org
        )

    def test_anonymous_cannot_list_sessions(self):
        response = self.client.get(reverse('attendancesession-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_can_list_sessions(self):
        self.client.force_authenticate(user=self.member_user)
        response = self.client.get(reverse('attendancesession-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_member_cannot_create_session(self):
        self.client.force_authenticate(user=self.member_user)
        data = {
            'title': 'New Session',
            'session_type': 'church',
            'date': '2026-06-04'
        }
        response = self.client.post(reverse('attendancesession-list'), data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_session(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'PTA Annual General Meeting',
            'session_type': 'pta',
            'date': '2026-06-04'
        }
        # In a real environment, perform_create generates QR code. We mock or test it here.
        # Since perform_create calls qrcode.make, it should run successfully as long as
        # qrcode library is installed (which it is, per requirements.txt).
        response = self.client.post(reverse('attendancesession-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AttendanceSession.objects.filter(title='PTA Annual General Meeting').exists())

    def test_member_scan_self(self):
        self.client.force_authenticate(user=self.member_user)
        url = reverse('attendancesession-scan', kwargs={'pk': self.session.id})
        
        # First check-in should be marked as first visit
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_first_visit'])
        self.assertEqual(response.data['message'], f'First visit recorded for {self.member_member}')
        
        # Second check-in should not fail, but indicate already recorded
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], f'{self.member_member} is already checked in for {self.session.title}!')

    def test_member_cannot_scan_for_others(self):
        self.client.force_authenticate(user=self.member_user)
        url = reverse('attendancesession-scan', kwargs={'pk': self.session.id})
        
        # Try to scan for admin
        response = self.client.post(url, {'member_id': self.admin_member.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_scan_for_others(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('attendancesession-scan', kwargs={'pk': self.session.id})
        
        response = self.client.post(url, {'member_id': self.member_member.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_first_visit'])

    def test_inactive_member_cannot_check_in(self):
        self.client.force_authenticate(user=self.inactive_user)
        url = reverse('attendancesession-scan', kwargs={'pk': self.session.id})
        
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], f'{self.inactive_member} is currently {self.inactive_member.status} and cannot check in.')


class AttendanceRecordAPITest(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Church", org_type="CHURCH", city="LUSAKA")
        # Create users & members
        self.admin_user = User.objects.create_user(username='admin@example.com', email='admin@example.com', password='password123')
        self.admin_member = Member.objects.create(
            user=self.admin_user, first_name='Admin', last_name='User',
            email='admin@example.com', phone_number='0971111111', role='admin',
            organization=self.org
        )

        self.pta_user = User.objects.create_user(username='pta@example.com', email='pta@example.com', password='password123')
        self.pta_member = Member.objects.create(
            user=self.pta_user, first_name='PTA', last_name='Official',
            email='pta@example.com', phone_number='0972222222', role='pta',
            organization=self.org
        )

        self.member_user1 = User.objects.create_user(username='m1@example.com', email='m1@example.com', password='password123')
        self.member_member1 = Member.objects.create(
            user=self.member_user1, first_name='M1', last_name='User',
            email='m1@example.com', phone_number='0973333333', role='member',
            organization=self.org
        )

        self.member_user2 = User.objects.create_user(username='m2@example.com', email='m2@example.com', password='password123')
        self.member_member2 = Member.objects.create(
            user=self.member_user2, first_name='M2', last_name='User',
            email='m2@example.com', phone_number='0974444444', role='member',
            organization=self.org
        )

        self.session = AttendanceSession.objects.create(
            title='Sunday Service', session_type='church', date='2026-06-03', organization=self.org
        )

        # Create records
        self.record1 = AttendanceRecord.objects.create(session=self.session, member=self.member_member1, is_first_visit=True)
        self.record2 = AttendanceRecord.objects.create(session=self.session, member=self.member_member2, is_first_visit=True)

    def test_anonymous_cannot_access_records(self):
        response = self.client.get(reverse('attendancerecord-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_can_only_see_own_records(self):
        self.client.force_authenticate(user=self.member_user1)
        response = self.client.get(reverse('attendancerecord-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see exactly 1 record
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.record1.id)

        # Try to retrieve other member's record (should return 404)
        response = self.client.get(reverse('attendancerecord-detail', kwargs={'pk': self.record2.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_and_pta_can_see_all_records(self):
        for user in [self.admin_user, self.pta_user]:
            self.client.force_authenticate(user=user)
            response = self.client.get(reverse('attendancerecord-list'))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['count'], 2)

    def test_member_cannot_modify_records(self):
        self.client.force_authenticate(user=self.member_user1)
        response = self.client.patch(reverse('attendancerecord-detail', kwargs={'pk': self.record1.id}), {'is_first_visit': False})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_modify_records(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(reverse('attendancerecord-detail', kwargs={'pk': self.record1.id}), {'is_first_visit': False})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.record1.refresh_from_db()
        self.assertFalse(self.record1.is_first_visit)
