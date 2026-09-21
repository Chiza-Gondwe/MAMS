from django.contrib import admin
from .models import ChatChannel, ChatMessage

@admin.register(ChatChannel)
class ChatChannelAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'channel_type', 'section', 'zone', 'ministry', 'created_at')
    list_filter = ('organization', 'channel_type')
    search_fields = ('name',)

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'channel', 'content', 'created_at')
    list_filter = ('channel__organization', 'channel')
    search_fields = ('content', 'sender__first_name', 'sender__last_name')
