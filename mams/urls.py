"""
URL configuration for mams project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from mams.serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from members.views import MemberViewSet, register_member, SectionViewSet, ZoneViewSet, UserViewSet, verify_email, resend_otp, MinistryViewSet
from attendance.views import AttendanceSessionViewSet, AttendanceRecordViewSet
from announcements.views import AnnouncementViewSet
from finances.views import LedgerAccountViewSet, DonationViewSet
from events.views import EventViewSet
from communications.views import EmailLogViewSet
from church_profile.views import OrganizationViewSet, PublicChurchViewSet
from school.views import ClassRoomViewSet, StudentViewSet
from sermons.views import SermonViewSet
from prayer.views import PrayerRequestViewSet

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'churches', PublicChurchViewSet, basename='church')
router.register(r'members', MemberViewSet, basename='member')
router.register(r'sections', SectionViewSet, basename='section')
router.register(r'zones', ZoneViewSet, basename='zone')
router.register(r'ministries', MinistryViewSet, basename='ministry')
router.register(r'users', UserViewSet, basename='user')
router.register(r'attendance/sessions', AttendanceSessionViewSet, basename='attendancesession')
router.register(r'attendance/records', AttendanceRecordViewSet, basename='attendancerecord')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'finances/ledger', LedgerAccountViewSet, basename='ledgeraccount')
router.register(r'finances/donations', DonationViewSet, basename='donation')
router.register(r'events', EventViewSet, basename='event')
router.register(r'communications/emails', EmailLogViewSet, basename='emaillog')
router.register(r'settings', OrganizationViewSet, basename='settings')
router.register(r'school/classes', ClassRoomViewSet, basename='classroom')
router.register(r'school/students', StudentViewSet, basename='student')
router.register(r'sermons', SermonViewSet, basename='sermon')
router.register(r'prayer-requests', PrayerRequestViewSet, basename='prayerrequest')

def home(request):
    return HttpResponse("MAMS API is running")

from communications.views import save_webpush_subscription
from church_profile.views import AnalyticsAPIView

from church_profile.views import SuperadminOrganizationViewSet
from members.views import create_local_admin, change_password

router.register(r'superadmin/organizations', SuperadminOrganizationViewSet, basename='superadmin-organization')

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', register_member, name='register_member'),
    path('api/members/create_local_admin/', create_local_admin, name='create_local_admin'),
    path('api/members/change_password/', change_password, name='change_password'),
    path('api/verify-email/', verify_email, name='verify_email'),
    path('api/resend-otp/', resend_otp, name='resend_otp'),
    path('api/analytics/', AnalyticsAPIView.as_view(), name='analytics'),
    path('webpush/', include('webpush.urls')),
    path('api/webpush/subscribe/', save_webpush_subscription, name='save_webpush_subscription'),
    path('api/', include(router.urls)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)