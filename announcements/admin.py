from django.contrib import admin
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'announcement_type', 'audience', 'created_by', 'created_at')
    list_filter = ('announcement_type', 'audience')
    search_fields = ('title', 'content')
