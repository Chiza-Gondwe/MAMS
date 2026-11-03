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
        ('treasurer', 'Church Treasurer'),
        ('zone_admin', 'Zone Elder'),
        ('section_admin', 'Section Elder'),
        ('zone_treasurer', 'Zone Treasurer'),
        ('section_treasurer', 'Section Treasurer'),
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
    middle_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, validators=[phone_regex])
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    organization = models.ForeignKey('church_profile.Organization', on_delete=models.CASCADE, related_name='members', null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    ministries = models.ManyToManyField(Ministry, blank=True, related_name='members')
    date_joined = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Leadership Term Fields (UCZ Standard & Organizational Terms)
    TERM_STATUS_CHOICES = [
        ('none', 'No Term Limit'),
        ('active', 'Active In Office'),
        ('expiring_soon', 'Expiring Soon (Within 14 Days)'),
        ('pending_transition', 'Term Concluded (Pending Transition)'),
        ('concluded', 'Term Concluded (Stepped Down)'),
    ]
    term_start_date = models.DateField(null=True, blank=True)
    term_end_date = models.DateField(null=True, blank=True)
    term_status = models.CharField(max_length=30, choices=TERM_STATUS_CHOICES, default='none')

    # Verification Fields
    is_verified = models.BooleanField(default=False)
    is_temporary_password = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    def check_and_update_term_status(self):
        """Update term status based on term dates and 14-day transition grace period."""
        if not self.term_end_date or self.role in ['member', 'superadmin', 'pta']:
            if self.term_status != 'none':
                self.term_status = 'none'
                if self.pk:
                    self.save(update_fields=['term_status'])
            return self.term_status
            
        from datetime import date, timedelta
        today = date.today()
        grace_end = self.term_end_date + timedelta(days=14)
        
        if today > grace_end:
            # 14-day transition expired: step down automatically to regular member
            self.role = 'member'
            self.term_status = 'concluded'
            if self.pk:
                self.save(update_fields=['role', 'term_status'])
        elif today > self.term_end_date:
            # Within 14-day transition period: allow duties while awaiting election results
            if self.term_status != 'pending_transition':
                self.term_status = 'pending_transition'
                if self.pk:
                    self.save(update_fields=['term_status'])
        elif today >= self.term_end_date - timedelta(days=14):
            # Within 14 days of ending: reminder status
            if self.term_status != 'expiring_soon':
                self.term_status = 'expiring_soon'
                if self.pk:
                    self.save(update_fields=['term_status'])
        else:
            if self.term_status != 'active':
                self.term_status = 'active'
                if self.pk:
                    self.save(update_fields=['term_status'])
                
        return self.term_status

    def __str__(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)


from django.db.models.signals import post_delete
from django.dispatch import receiver

@receiver(post_delete, sender=Member)
def delete_linked_user_on_member_delete(sender, instance, **kwargs):
    """Ensure that whenever a Member/Admin (or their entire Organization) is deleted,
    their linked auth_user account is also completely removed from the database."""
    if instance.user_id:
        User.objects.filter(id=instance.user_id).delete()
