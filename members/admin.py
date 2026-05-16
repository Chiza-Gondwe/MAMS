from django.contrib import admin
from .models import Member

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'phone_number', 'role', 'status', 'date_joined')
    list_filter = ('role', 'status')
    search_fields = ('first_name', 'last_name', 'email', 'phone_number')
