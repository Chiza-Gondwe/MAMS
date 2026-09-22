from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from church_profile.models import Organization
from members.models import Member
from members.serializers import RegisterMemberSerializer

class MemberModelTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser@example.com', email='testuser@example.com', password='password123')

    def test_create_valid_member(self):
        member = Member.objects.create(
            user=self.user,
            first_name='John',
            last_name='Doe',
            email='testuser@example.com',
            phone_number='0971234567',
            role='member',
            status='active'
        )
        self.assertEqual(member.first_name, 'John')
        self.assertEqual(member.last_name, 'Doe')
        self.assertEqual(member.email, 'testuser@example.com')
        self.assertEqual(member.phone_number, '0971234567')
        self.assertEqual(member.role, 'member')
        self.assertEqual(member.status, 'active')
        self.assertEqual(str(member), 'John Doe')

    def test_phone_number_regex_validation(self):
        valid_numbers = [
            '0971234567',
            '0961234567',
            '0951234567',
            '0761234567',
            '0551234567',
            '+260971234567',
            '+260751234567',
            '+260591234567',
            '260971234567',
        ]
        for num in valid_numbers:
            member = Member(
                user=self.user,
                first_name='John',
                last_name='Doe',
                email='testuser@example.com',
                phone_number=num,
            )
            try:
                member.full_clean()
            except ValidationError:
                self.fail(f"Valid phone number {num} failed regex validation.")

        invalid_numbers = [
            '1234567',
            '097123456',
            '+2609712345678',
            'abcd',
            '0941234567', # 94 is not in the allowed range (95-99)
            '0741234567', # 74 is not in the allowed range (75-79)
            '0451234567', # 45 is not in the allowed range (50-59)
        ]
        for num in invalid_numbers:
            member = Member(
                user=self.user,
                first_name='John',
                last_name='Doe',
                email='testuser@example.com',
                phone_number=num,
            )
            with self.assertRaises(ValidationError, msg=f"Invalid phone number {num} passed validation."):
                member.full_clean()


class RegisterMemberSerializerTest(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Church", org_type="CHURCH", city="LUSAKA")

    def test_serializer_with_valid_data(self):
        data = {
            'first_name': 'Alice',
            'last_name': 'Smith',
            'email': 'alice@example.com',
            'phone_number': '0979876543',
            'role': 'member',
            'status': 'active',
            'password': 'securepassword123',
            'organization': self.org.id
        }
        serializer = RegisterMemberSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        member = serializer.save()
        
        self.assertEqual(member.first_name, 'Alice')
        self.assertEqual(member.email, 'alice@example.com')
        # Check User creation
        user = User.objects.get(email='alice@example.com')
        self.assertEqual(user.username, 'alice@example.com')
        self.assertTrue(user.check_password('securepassword123'))
        self.assertEqual(member.user, user)


class MemberAPITest(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Church", org_type="CHURCH", city="LUSAKA")
        # Create users & members for each role
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

        self.member_user = User.objects.create_user(username='member@example.com', email='member@example.com', password='password123')
        self.member_member = Member.objects.create(
            user=self.member_user, first_name='Regular', last_name='Member',
            email='member@example.com', phone_number='0973333333', role='member',
            organization=self.org
        )

    def test_anonymous_access_denied(self):
        response = self.client.get(reverse('member-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_list_and_retrieve_all(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('member-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see all 3 members
        self.assertEqual(response.data['count'], 3)

        response = self.client.get(reverse('member-detail', kwargs={'pk': self.member_member.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Regular')

    def test_pta_can_list_and_retrieve_all_but_not_create(self):
        self.client.force_authenticate(user=self.pta_user)
        response = self.client.get(reverse('member-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

        # PTA tries to delete a member (should be denied)
        response = self.client.delete(reverse('member-detail', kwargs={'pk': self.member_member.id}))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_scoped_visibility(self):
        self.client.force_authenticate(user=self.member_user)
        
        # Listing should return 2 records (themselves + leadership admin, but not PTA)
        response = self.client.get(reverse('member-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        member_ids = [m['id'] for m in response.data['results']]
        self.assertIn(self.member_member.id, member_ids)
        self.assertIn(self.admin_member.id, member_ids)
        self.assertNotIn(self.pta_member.id, member_ids)

        # Retrieving their own should work
        response = self.client.get(reverse('member-detail', kwargs={'pk': self.member_member.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Retrieving leadership admin works for contact / directions
        response = self.client.get(reverse('member-detail', kwargs={'pk': self.admin_member.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Modifying their own profile should return 200 OK
        response = self.client.patch(reverse('member-detail', kwargs={'pk': self.member_member.id}), {'first_name': 'NewName'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_register_member_endpoint(self):
        data = {
            'first_name': 'Bob',
            'last_name': 'Builder',
            'email': 'bob@example.com',
            'phone_number': '0978888888',
            'role': 'member',
            'status': 'active',
            'password': 'bobspassword123',
            'organization': self.org.id
        }
        response = self.client.post(reverse('register_member'), data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('member', response.data)
        self.assertEqual(response.data['member']['email'], 'bob@example.com')
