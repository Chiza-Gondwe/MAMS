from mams.mixins import BaseMultiTenantViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.contrib.auth.models import User
from .models import EmailLog
from .serializers import EmailLogSerializer
from members.models import Member

class EmailLogViewSet(BaseMultiTenantViewSet):
    serializer_class = EmailLogSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, 'member_profile'):
            return EmailLog.objects.none()
        return EmailLog.objects.filter(organization=user.member_profile.organization).order_by('-sent_at')

    @action(detail=False, methods=['post'], url_path='send_email')
    def send_email(self, request):
        subject = request.data.get('subject')
        body = request.data.get('body')
        
        if not subject or not body:
            return Response({'error': 'Subject and body are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get all members with emails for the current church
        profile = getattr(request.user, 'member_profile', None)
        if not profile:
            return Response({'error': 'User has no organization profile'}, status=status.HTTP_400_BAD_REQUEST)
        
        church = profile.organization
        recipients = Member.objects.filter(organization=church).exclude(email__isnull=True).exclude(email__exact='')
        recipient_emails = [member.email for member in recipients]
        
        if not recipient_emails:
            return Response({'error': 'No members with email addresses found'}, status=status.HTTP_400_BAD_REQUEST)

        # Send bulk email asynchronously in background batches of 50 (using BCC to protect privacy)
        try:
            from mams.email_service import send_bulk_email_async
            org_name = church.name if (church and church.name) else "MAMS"
            send_bulk_email_async(
                subject=subject,
                body=body,
                recipient_emails=recipient_emails,
                org_name=org_name,
            )
            
            # Log it in the database
            EmailLog.objects.create(
                organization=church,
                subject=subject,
                body=body,
                sender=request.user if request.user.is_authenticated else None,
                recipient_count=len(recipient_emails),
                status='Sent'
            )
            
            return Response({'message': f'Email queued for background delivery to {len(recipient_emails)} recipients'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from webpush.models import SubscriptionInfo, PushInformation
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_webpush_subscription(request):
    data = request.data
    subscription_data = data.get('subscription', {})
    keys = subscription_data.get('keys', {})
    
    if not subscription_data.get('endpoint'):
        return Response({'error': 'No endpoint provided'}, status=status.HTTP_400_BAD_REQUEST)

    sub_info, created = SubscriptionInfo.objects.get_or_create(
        endpoint=subscription_data.get('endpoint'),
        defaults={
            'browser': data.get('browser', 'unknown'),
            'user_agent': data.get('user_agent', '')[:500],
            'auth': keys.get('auth', ''),
            'p256dh': keys.get('p256dh', '')
        }
    )
    
    PushInformation.objects.get_or_create(
        user=request.user,
        subscription=sub_info
    )
    
    return Response({'status': 'subscribed'}, status=status.HTTP_201_CREATED)
