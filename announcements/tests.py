from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.exceptions import ValidationError
from members.models import Member
from announcements.models import Announcement
from announcements.serializers import AnnouncementSerializer

class AnnouncementSerializerTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin@example.com', email='admin@example.com', password='password123')
        self.member = Member.objects.create(
            user=self.user, first_name='Admin', last_name='User',
            email='admin@example.com', phone_number='0971111111', role='admin'
        )

    def test_text_announcement_without_video_url(self):
        data = {
            'title': 'Sunday Service Cancelled',
            'content': 'Due to maintenance, service is cancelled.',
            'announcement_type': 'text',
            'audience': 'all',
            'created_by': self.member.id
        }
        serializer = AnnouncementSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        announcement = serializer.save()
        self.assertEqual(announcement.announcement_type, 'text')
        self.assertIsNone(announcement.video_url)

    def test_video_announcement_with_valid_video_url(self):
        data = {
            'title': 'Sermon Highlights',
            'content': 'Watch highlights of Sunday sermon.',
            'announcement_type': 'video',
            'audience': 'all',
            'video_url': 'https://example.com/video.mp4',
            'created_by': self.member.id
        }
        serializer = AnnouncementSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        announcement = serializer.save()
        self.assertEqual(announcement.video_url, 'https://example.com/video.mp4')

    def test_video_announcement_requires_video_url(self):
        data = {
            'title': 'Sermon Highlights',
            'content': 'Watch highlights of Sunday sermon.',
            'announcement_type': 'video',
            'audience': 'all',
            'created_by': self.member.id
        }
        serializer = AnnouncementSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('video_url', serializer.errors)

    def test_video_announcement_requires_https_prefix(self):
        data = {
            'title': 'Sermon Highlights',
            'content': 'Watch highlights of Sunday sermon.',
            'announcement_type': 'video',
            'audience': 'all',
            'video_url': 'http://example.com/video.mp4', # http instead of https
            'created_by': self.member.id
        }
        serializer = AnnouncementSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('video_url', serializer.errors)


class AnnouncementAPITest(APITestCase):
    def setUp(self):
        # Create users & members
        self.admin_user = User.objects.create_user(username='admin@example.com', email='admin@example.com', password='password123')
        self.admin_member = Member.objects.create(
            user=self.admin_user, first_name='Admin', last_name='User',
            email='admin@example.com', phone_number='0971111111', role='admin'
        )

        self.pta_user = User.objects.create_user(username='pta@example.com', email='pta@example.com', password='password123')
        self.pta_member = Member.objects.create(
            user=self.pta_user, first_name='PTA', last_name='Official',
            email='pta@example.com', phone_number='0972222222', role='pta'
        )

        self.member_user = User.objects.create_user(username='member@example.com', email='member@example.com', password='password123')
        self.member_member = Member.objects.create(
            user=self.member_user, first_name='Regular', last_name='Member',
            email='member@example.com', phone_number='0973333333', role='member'
        )

        # Create announcements
        self.ann_all = Announcement.objects.create(
            title='General Notice', content='All members read this.',
            announcement_type='text', audience='all', created_by=self.admin_member
        )
        self.ann_pta = Announcement.objects.create(
            title='PTA Only Notice', content='Only PTA read this.',
            announcement_type='text', audience='pta', created_by=self.admin_member
        )
        self.ann_church = Announcement.objects.create(
            title='Church Only Notice', content='Only Church members read this.',
            announcement_type='text', audience='members', created_by=self.admin_member
        )

    def test_anonymous_cannot_access_announcements(self):
        response = self.client.get(reverse('announcement-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_sees_all_announcements(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('announcement-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

    def test_pta_sees_all_and_pta_announcements(self):
        self.client.force_authenticate(user=self.pta_user)
        response = self.client.get(reverse('announcement-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see general and PTA notice (total 2)
        self.assertEqual(response.data['count'], 3)
        titles = [ann['title'] for ann in response.data['results']]
        self.assertIn('General Notice', titles)
        self.assertIn('PTA Only Notice', titles)
        self.assertIn('Church Only Notice', titles)

    def test_member_sees_all_and_church_announcements(self):
        self.client.force_authenticate(user=self.member_user)
        response = self.client.get(reverse('announcement-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see general and church notice (total 2)
        self.assertEqual(response.data['count'], 2)
        titles = [ann['title'] for ann in response.data['results']]
        self.assertIn('General Notice', titles)
        self.assertNotIn('PTA Only Notice', titles)
        self.assertIn('Church Only Notice', titles)

    def test_member_cannot_create_announcement(self):
        self.client.force_authenticate(user=self.member_user)
        data = {
            'title': 'Unpermitted announcement',
            'content': 'Should fail',
            'announcement_type': 'text',
            'audience': 'all'
        }
        response = self.client.post(reverse('announcement-list'), data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_announcement(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'Official Announcement',
            'content': 'Created by Admin',
            'announcement_type': 'text',
            'audience': 'all',
            'created_by': self.admin_member.id
        }
        response = self.client.post(reverse('announcement-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
