from django.apps import AppConfig


import sys

class EventsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'events'

    def ready(self):
        # Prevent scheduler from running multiple times in development or during migrations
        if 'runserver' not in sys.argv:
            return
            
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from django_apscheduler.jobstores import DjangoJobStore, register_events
            from apscheduler.triggers.cron import CronTrigger
            from .jobs import send_event_reminders
            
            scheduler = BackgroundScheduler()
            scheduler.add_jobstore(DjangoJobStore(), "default")
            
            # Schedule the job to run every day at 8:00 AM
            scheduler.add_job(
                send_event_reminders,
                trigger=CronTrigger(hour="08", minute="00"), 
                id="send_event_reminders",
                max_instances=1,
                replace_existing=True,
            )
            
            register_events(scheduler)
            scheduler.start()
            print("Scheduler started... event reminders configured.")
        except Exception as e:
            print("Failed to start scheduler:", e)
