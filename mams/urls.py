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
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from members.views import MemberViewSet, register_member
from attendance.views import AttendanceSessionViewSet, AttendanceRecordViewSet
from announcements.views import AnnouncementViewSet

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
router.register(r'attendance/sessions', AttendanceSessionViewSet)
router.register(r'attendance/records', AttendanceRecordViewSet)
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

def home(request):
    return HttpResponse("MAMS API is running")

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', register_member, name='register_member'),
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)