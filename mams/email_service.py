import threading
import time
from concurrent.futures import ThreadPoolExecutor
from django.core.mail import EmailMessage, get_connection
from django.conf import settings

# Background worker pool for non-blocking, high-concurrency email delivery (supports 50-1,000+ users)
_email_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="mams_email_worker")


def _format_sender(org_name=None):
    clean_org = org_name.strip() if (org_name and org_name.strip()) else "MAMS"
    email_user = getattr(settings, "EMAIL_HOST_USER", "")
    if email_user:
        return f"{clean_org} <{email_user}>"
    return getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@mams.local")


def _send_single_with_retry(subject, body, recipient_email, org_name=None, max_retries=3):
    sender = _format_sender(org_name)
    for attempt in range(1, max_retries + 1):
        try:
            connection = get_connection(timeout=getattr(settings, "EMAIL_TIMEOUT", 10))
            msg = EmailMessage(
                subject=subject,
                body=body,
                from_email=sender,
                to=[recipient_email],
                connection=connection,
            )
            msg.send(fail_silently=False)
            print(f"[MAMS EMAIL SENT] To: {recipient_email} | Subject: {subject}")
            return True
        except Exception as exc:
            print(f"[MAMS EMAIL RETRY {attempt}/{max_retries}] To: {recipient_email} failed: {exc}")
            if attempt < max_retries:
                time.sleep(2 * attempt)
    print(f"[MAMS EMAIL FAILED] Could not deliver email to {recipient_email} after {max_retries} attempts.")
    return False


def send_email_async(subject, body, recipient_email, org_name=None):
    """
    Queues a single transactional email (OTP verification, password reset, welcome email).
    On PythonAnywhere uWSGI (where background threads are paused after the HTTP response),
    sends synchronously with a fast timeout so Gmail SMTP always completes.
    """
    if not recipient_email:
        return
    import os
    is_pythonanywhere = bool(
        os.environ.get("PYTHONANYWHERE_DOMAIN")
        or os.environ.get("PYTHONANYWHERE_SITE")
        or "pythonanywhere" in os.environ.get("HOSTNAME", "").lower()
        or os.getenv("DB_ENGINE", "").lower() == "sqlite3"
    )
    if is_pythonanywhere:
        _send_single_with_retry(subject, body, recipient_email.strip(), org_name, max_retries=1)
    else:
        _email_executor.submit(_send_single_with_retry, subject, body, recipient_email.strip(), org_name)


def _send_bulk_batches_with_retry(subject, body, recipient_emails, org_name=None, batch_size=50):
    """
    Sends bulk emails to 50, 100, or 1,000+ members by reusing a single persistent SMTP
    connection per batch of 50 BCC recipients with automatic retry per batch.
    """
    sender = _format_sender(org_name)
    email_user = getattr(settings, "EMAIL_HOST_USER", "") or "noreply@mams.local"
    clean_recipients = [e.strip() for e in recipient_emails if e and e.strip()]
    if not clean_recipients:
        return

    for i in range(0, len(clean_recipients), batch_size):
        batch = clean_recipients[i : i + batch_size]
        for attempt in range(1, 4):
            try:
                with get_connection(timeout=getattr(settings, "EMAIL_TIMEOUT", 15)) as connection:
                    msg = EmailMessage(
                        subject=subject,
                        body=body,
                        from_email=sender,
                        to=[email_user],
                        bcc=batch,
                        connection=connection,
                    )
                    msg.send(fail_silently=False)
                print(f"[MAMS BULK EMAIL SENT] Batch {i // batch_size + 1} ({len(batch)} recipients)")
                break
            except Exception as exc:
                print(f"[MAMS BULK EMAIL RETRY {attempt}/3] Batch {i // batch_size + 1} failed: {exc}")
                if attempt < 3:
                    time.sleep(2 * attempt)


def send_bulk_email_async(subject, body, recipient_emails, org_name=None):
    """
    Dispatches bulk emails to 50, 100, or 1,000+ recipients asynchronously in batches of 50.
    """
    if not recipient_emails:
        return
    _email_executor.submit(_send_bulk_batches_with_retry, subject, body, list(recipient_emails), org_name)
