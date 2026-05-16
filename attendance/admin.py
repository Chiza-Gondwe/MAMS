from django.contrib import admin
from .models import AttendanceSession, AttendanceRecord

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'session_type', 'date', 'created_at')
    list_filter = ('session_type', 'date')
    search_fields = ('title',)

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('member', 'session', 'scanned_at', 'is_first_visit')
    list_filter = ('is_first_visit', 'session')
    search_fields = ('member__first_name', 'member__last_name', 'member__email')
