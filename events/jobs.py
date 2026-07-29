from datetime import timedelta
from django.utils import timezone
from .models import Event
from django.contrib.auth import get_user_model
from webpush import send_user_notification

def send_event_reminders():
    print("Running automated event reminder job...")
    tomorrow = timezone.now().date() + timedelta(days=1)
    
    # Get all events happening tomorrow
    upcoming_events = Event.objects.filter(date=tomorrow)
    if not upcoming_events.exists():
        print("No events tomorrow to remind about.")
        return
        
    User = get_user_model()
    users = User.objects.all()
    
    for event in upcoming_events:
        payload = {
            "head": f"Reminder: {event.title} Tomorrow!",
            "body": f"Don't forget! {event.title} is happening tomorrow at {event.time.strftime('%I:%M %p')}.",
            "icon": "/logo192.png",
            "data": {"url": "/dashboard/events"}
        }
        
        church_users = users.filter(member_profile__organization=event.organization)
        
        count = 0
        for u in church_users:
            try:
                send_user_notification(user=u, payload=payload, ttl=1000)
                count += 1
            except Exception as e:
                pass
                
        print(f"Sent {count} reminders for event: {event.title}")
