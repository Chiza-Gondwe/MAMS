"""
Backend response-time measurement for the MAMS report (Section 6.4, Table 6.3).

What it does:
  1. Creates a temporary test database (Django deletes it afterwards) with
     one organisation, 500 active members, 6 past attendance sessions with
     300-400 check-ins each, and 50 announcements.
  2. Sends each request 15-30 times through the Django test client and times
     every request with time.perf_counter().
  3. Prints the median and 95th percentile time (in milliseconds) per operation.

The times are backend processing only (no internet travel time), measured on
the machine where the command is run.

Run with:  python manage.py test perfcheck      (takes about 4 minutes)
"""
import datetime
import statistics
import time

from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase

from announcements.models import Announcement
from attendance.models import AttendanceRecord, AttendanceSession
from church_profile.models import Organization
from members.models import Member


def measure(request_fn, repeats=30):
    """Run request_fn several times; return (median_ms, p95_ms)."""
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        response = request_fn()
        times.append((time.perf_counter() - start) * 1000)
        assert response.status_code < 400, (response.status_code, getattr(response, "data", None))
    times.sort()
    return statistics.median(times), times[int(len(times) * 0.95) - 1]


class ResponseTimes(APITestCase):

    def test_response_times(self):
        # ---------- seed the test database ----------
        org = Organization.objects.create(name="Perf Church", org_type="CHURCH", city="LUSAKA")
        admin_user = User.objects.create_user("admin@p.com", "admin@p.com", "pass12345")
        admin = Member.objects.create(user=admin_user, first_name="A", last_name="Admin", email="admin@p.com",
                                      phone_number="0971111111", role="admin", status="active",
                                      organization=org, is_verified=True)
        members = []
        for i in range(500):
            u = User.objects.create_user(f"m{i}@p.com", f"m{i}@p.com", "x")
            members.append(Member.objects.create(user=u, first_name=f"M{i}", last_name="Test", email=f"m{i}@p.com",
                                                 phone_number="0971234567", role="member", status="active",
                                                 organization=org, is_verified=True))
        today = datetime.date.today()
        for s in range(6):
            session = AttendanceSession.objects.create(organization=org, title=f"S{s}", session_type="church",
                                                       date=today - datetime.timedelta(days=7 * (s + 1)))
            AttendanceRecord.objects.bulk_create(
                [AttendanceRecord(session=session, member=m) for m in members[: 300 + s * 20]])
        for a in range(50):
            Announcement.objects.create(organization=org, title=f"A{a}", content="x" * 300,
                                        announcement_type="text", audience="all", created_by=admin)

        # ---------- measure ----------
        c = APIClient()
        login = {"username": "admin@p.com", "password": "pass12345"}
        results = {}
        results["Login (POST /api/token/)"] = measure(lambda: c.post("/api/token/", login, format="json"), 20)
        token = c.post("/api/token/", login, format="json").data["access"]
        c.credentials(HTTP_AUTHORIZATION="Bearer " + token)
        results["List all members (GET /api/members/)"] = measure(lambda: c.get("/api/members/"))
        results["List announcements (GET /api/announcements/)"] = measure(lambda: c.get("/api/announcements/"))
        results["Analytics and AI insights (GET /api/analytics/)"] = measure(lambda: c.get("/api/analytics/"), 15)
        results["Create attendance session with QR (POST)"] = measure(
            lambda: c.post("/api/attendance/sessions/", {"title": "New", "session_type": "church", "date": str(today)},
                           format="json"), 15)
        next_member = iter(members[400:])
        results["QR check-in (POST scan_today)"] = measure(
            lambda: c.post("/api/attendance/sessions/scan_today/", {"member_id": next(next_member).id}, format="json"), 30)

        print("\nOperation | median (ms) | 95th percentile (ms)")
        for name, (median, p95) in results.items():
            print(f"{name} | {median:.1f} | {p95:.1f}")
