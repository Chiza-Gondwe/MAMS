from django.urls import path
from .views import ChannelListAPIView, ChannelMessagesAPIView, ChatMessageDetailAPIView, ChatBulkDeleteAPIView

urlpatterns = [
    path('channels/', ChannelListAPIView.as_view(), name='chat-channels-list'),
    path('channels/<int:channel_id>/messages/', ChannelMessagesAPIView.as_view(), name='chat-channel-messages'),
    path('messages/bulk-delete/', ChatBulkDeleteAPIView.as_view(), name='chat-messages-bulk-delete'),
    path('messages/<int:message_id>/', ChatMessageDetailAPIView.as_view(), name='chat-message-detail'),
]
