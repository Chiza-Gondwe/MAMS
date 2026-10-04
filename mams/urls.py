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

from django.http import FileResponse
from django.urls import re_path
from django.views.static import serve as static_serve

FRONTEND_DIST = settings.BASE_DIR / 'frontend' / 'dist'

def serve_react_index(request):
    index_file = FRONTEND_DIST / 'index.html'
    if index_file.exists():
        return FileResponse(open(index_file, 'rb'), content_type='text/html')
    return HttpResponse("MAMS API is running")

def download_mobile_apk(request):
    apk_file = settings.BASE_DIR / 'MAMS_Mobile_Release.apk'
    if apk_file.exists():
        return FileResponse(
            open(apk_file, 'rb'),
            as_attachment=True,
            filename='MAMS_Mobile.apk',
            content_type='application/vnd.android.package-archive',
        )
    return HttpResponse("MAMS Mobile APK not found on server.", status=404)

def app_version_info(request):
    import json
    from django.http import JsonResponse
    version_file = settings.BASE_DIR / 'mams' / 'app_version.json'
    data = {
        "version": "1.2.0",
        "build_number": 2,
        "release_notes": "Latest MAMS Mobile release.",
    }
    if version_file.exists():
        try:
            with open(version_file, 'r', encoding='utf-8') as f:
                data.update(json.load(f))
        except Exception:
            pass
    scheme = 'https' if request.is_secure() or 'pythonanywhere.com' in request.get_host() else request.scheme
    data['download_url'] = f"{scheme}://{request.get_host()}/api/download-app/?v={data.get('build_number', 2)}"
    return JsonResponse(data)

from communications.views import save_webpush_subscription
from church_profile.views import AnalyticsAPIView, MobileDashboardAPIView
from church_profile.ai_engine import AIDraftMessageAPIView

from church_profile.views import SuperadminOrganizationViewSet
from members.views import create_local_admin, change_password, get_current_user, update_my_profile, request_password_reset, confirm_password_reset

router.register(r'superadmin/organizations', SuperadminOrganizationViewSet, basename='superadmin-organization')

urlpatterns = [
    path('', serve_react_index),
    path('api/download-app/', download_mobile_apk, name='download_mobile_apk'),
    path('api/app-version/', app_version_info, name='app_version_info'),
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', register_member, name='register_member'),
    path('api/auth/me/', get_current_user, name='auth_me'),
    path('api/auth/update_profile/', update_my_profile, name='update_my_profile'),
    path('api/members/create_local_admin/', create_local_admin, name='create_local_admin'),
    path('api/members/change_password/', change_password, name='change_password'),
    path('api/password-reset/request/', request_password_reset, name='request_password_reset'),
    path('api/password-reset/confirm/', confirm_password_reset, name='confirm_password_reset'),
    path('api/verify-email/', verify_email, name='verify_email'),
    path('api/resend-otp/', resend_otp, name='resend_otp'),
    path('api/analytics/', AnalyticsAPIView.as_view(), name='analytics'),
    path('api/mobile-dashboard/', MobileDashboardAPIView.as_view(), name='mobile_dashboard'),
    path('api/ai/draft-message/', AIDraftMessageAPIView.as_view(), name='ai_draft_message'),
    path('api/chat/', include('chat.urls')),
    path('webpush/', include('webpush.urls')),
    path('api/webpush/subscribe/', save_webpush_subscription, name='save_webpush_subscription'),
    path('api/', include(router.urls)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    re_path(r'^assets/(?P<path>.*)$', static_serve, {'document_root': FRONTEND_DIST / 'assets'}),
    re_path(r'^(?P<path>favicon\.svg|icons\.svg)$', static_serve, {'document_root': FRONTEND_DIST}),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    re_path(r'^(?!api/|admin/|static/|media/|assets/|webpush/).*$', serve_react_index),
]