from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth.models import User

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        'no_active_account': 'Incorrect email or password.'
    }

    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except AuthenticationFailed as e:
            username = attrs.get(self.username_field)
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.filter(email=username).first()
            
            if user and not user.is_active:
                raise AuthenticationFailed('account_not_verified')
            raise e

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        token['username'] = user.username
        token['user_id'] = user.id

        # Add custom claims from the user's Member profile
        profile = getattr(user, 'member_profile', None)
        if profile:
            token['member_id'] = profile.id
            token['role'] = profile.role
            token['status'] = profile.status
            token['first_name'] = profile.first_name or user.first_name
            token['last_name'] = profile.last_name or user.last_name
            token['is_temporary_password'] = profile.is_temporary_password
            if profile.organization:
                token['org_type'] = profile.organization.org_type
                token['org_name'] = profile.organization.name
        else:
            token['first_name'] = user.first_name
            token['last_name'] = user.last_name
            
        return token
