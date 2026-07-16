from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator

class Section(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='sections', null=True, blank=True)
    name = models.CharField(max_length=100)
    zone = models.ForeignKey('Zone', on_delete=models.SET_NULL, null=True, blank=True, related_name='sections')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Zone(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='zones', null=True, blank=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Ministry(models.Model):
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='ministries', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Member(models.Model):
    ROLE_CHOICES = [
        ('superadmin', 'System Super-Admin'),
        ('admin', 'Tenant Organizational Admin'),
        ('section_admin', 'Section Leader'),
        ('zone_admin', 'Zone Leader'),
        ('group_leader', 'Group/Choir Leader'),
        ('pta', 'PTA Member'),
        ('member', 'Regular Member'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending_review', 'Holding Tank (Pending Review)'),
    ]

    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]

    phone_regex = RegexValidator(
    regex=r'^(\+?260|0)(9[5-9]|7[5-9]|5[0-9])\d{7}$',
    message="Enter a valid Zambian phone number e.g. 0971234567, 0551234567 or +260971234567"
)

    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='member_profile'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, validators=[phone_regex])
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='members', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    ministries = models.ManyToManyField(Ministry, blank=True, related_name='members')
    date_joined = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Verification Fields
    is_verified = models.BooleanField(default=False)
    is_temporary_password = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"