from django.db import models

class Organization(models.Model):
    ORG_TYPE_CHOICES = (
        ('CHURCH', 'Church'),
        ('PTA', 'Parent Teacher Association (PTA)'),
    )
    
    CITY_CHOICES = (
        ('LUSAKA', 'Lusaka'),
        ('KITWE', 'Kitwe'),
        ('NDOLA', 'Ndola'),
        ('KABWE', 'Kabwe'),
        ('CHINGOLA', 'Chingola'),
        ('MUFULIRA', 'Mufulira'),
        ('LIVINGSTONE', 'Livingstone'),
        ('LUANSHYA', 'Luanshya'),
        ('KASAMA', 'Kasama'),
        ('CHIPATA', 'Chipata'),
        ('SOLWEZI', 'Solwezi'),
        ('MANSA', 'Mansa'),
        ('MONGU', 'Mongu'),
        ('CHOMA', 'Choma'),
        ('MAZABUKA', 'Mazabuka'),
        ('KAFUE', 'Kafue'),
    )

    org_code = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=255)
    org_type = models.CharField(max_length=20, choices=ORG_TYPE_CHOICES, default='CHURCH')
    city = models.CharField(max_length=50, choices=CITY_CHOICES, default='LUSAKA')
    
    # Generic Profile Information
    address = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    
    # SMTP Settings (for email notifications)
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True)
    smtp_password = models.CharField(max_length=255, blank=True)
    use_tls = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.org_code:
            city_prefix = self.city[:3].upper() if self.city else 'XXX'
            org_initial = self.org_type[0].upper() if self.org_type else 'X'
            
            # Auto-increment logic
            last_org = Organization.objects.filter(
                city=self.city, 
                org_type=self.org_type
            ).order_by('id').last()
            
            if last_org and last_org.org_code:
                try:
                    last_num = int(last_org.org_code.split('-')[-1])
                    new_num = last_num + 1
                except ValueError:
                    new_num = 1
            else:
                new_num = 1
                
            self.org_code = f"{city_prefix}-{org_initial}-{new_num:03d}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.org_code})"
