"""
Security tests for privilege escalation and organisation isolation.

These tests send requests directly to the API (not through the apps) to make
sure the server itself refuses attempts to gain more access than allowed.
Run with:  python manage.py test members
"""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from church_profile.models import Organization
from members.models import Member

PASSWORD = "Str0ng!Pass987"


class PrivilegeEscalationTests(APITestCase):

    def setUp(self):
        # A real church with one ordinary member
        self.victim_org = Organization.objects.create(name="Victim Church", org_type="CHURCH", city="LUSAKA")
        user = User.objects.create_user("member@victim.test", "member@victim.test", PASSWORD)
        self.victim_member = Member.objects.create(
            user=user, first_name="Vic", last_name="Tim", email="member@victim.test",
            phone_number="0971111111", organization=self.victim_org, role="member", is_verified=True)

    # ---------- helpers ----------
    def login(self, email):
        response = self.client.post("/api/token/", {"username": email, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + response.data["access"])

    def register_fake_church(self, email, phone):
        """Anyone can register a new organisation and becomes its admin."""
        response = self.client.post("/api/churches/register/", {
            "church_name": "Fake Church " + email, "first_name": "Mal", "last_name": "Lory",
            "email": email, "phone": phone, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 201)
        return Member.objects.get(email=email)

    # ---------- tests ----------
    def test_public_registration_cannot_choose_role_or_status(self):
        self.client.post("/api/register/", {
            "first_name": "Eve", "last_name": "X", "email": "eve@attacker.test",
            "phone_number": "0971234567", "password": PASSWORD,
            "organization": self.victim_org.id, "role": "superadmin", "status": "active"}, format="json")
        eve = Member.objects.get(email="eve@attacker.test")
        self.assertEqual(eve.role, "member")
        self.assertEqual(eve.status, "pending_review")

    def test_member_cannot_promote_themselves(self):
        self.login("member@victim.test")
        response = self.client.patch(f"/api/members/{self.victim_member.id}/", {"role": "admin"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.victim_member.refresh_from_db()
        self.assertEqual(self.victim_member.role, "member")

    def test_organisation_admin_cannot_make_themselves_superadmin(self):
        admin = self.register_fake_church("mal@attacker.test", "0972222222")
        self.login("mal@attacker.test")
        response = self.client.patch(f"/api/members/{admin.id}/", {"role": "superadmin"}, format="json")
        self.assertEqual(response.status_code, 403)
        admin.refresh_from_db()
        self.assertEqual(admin.role, "admin")

    def test_organisation_admin_cannot_create_a_superadmin(self):
        self.register_fake_church("a2@attacker.test", "0973333333")
        self.login("a2@attacker.test")
        response = self.client.post("/api/members/", {
            "first_name": "S", "last_name": "U", "email": "su@attacker.test",
            "phone_number": "0974444444", "role": "superadmin"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Member.objects.filter(email="su@attacker.test").exists())

    def test_admin_cannot_read_another_organisations_member(self):
        self.register_fake_church("o@attacker.test", "0975555555")
        self.login("o@attacker.test")
        response = self.client.get(f"/api/members/{self.victim_member.id}/")
        self.assertEqual(response.status_code, 404)

    def test_admin_cannot_move_themselves_into_another_organisation(self):
        admin = self.register_fake_church("a3@attacker.test", "0976666666")
        self.login("a3@attacker.test")
        response = self.client.patch(f"/api/members/{admin.id}/", {"organization": self.victim_org.id}, format="json")
        self.assertEqual(response.status_code, 403)
        admin.refresh_from_db()
        self.assertNotEqual(admin.organization_id, self.victim_org.id)
