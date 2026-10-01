from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from django.db.models import Q, Value
from django.db.models.functions import Concat


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        'no_active_account': 'Incorrect username, email, or password.'
    }

    def _resolve_user(self, identifier: str, password: str):
        ident = (identifier or '').strip()
        if not ident:
            return None

        # Build candidate query matching username, email, email prefix (before @),
        # first_name, full name ("First Last" or "First Middle Last"), or phone_number
        qs = User.objects.annotate(
            full_name_user=Concat('first_name', Value(' '), 'last_name'),
            full_name_member=Concat(
                'member_profile__first_name',
                Value(' '),
                'member_profile__last_name',
            ),
            full_name_three=Concat(
                'member_profile__first_name',
                Value(' '),
                'member_profile__middle_name',
                Value(' '),
                'member_profile__last_name',
            ),
        ).filter(
            Q(username__iexact=ident)
            | Q(email__iexact=ident)
            | Q(email__istartswith=f"{ident}@")
            | Q(first_name__iexact=ident)
            | Q(member_profile__first_name__iexact=ident)
            | Q(full_name_user__iexact=ident)
            | Q(full_name_member__iexact=ident)
            | Q(full_name_three__iexact=ident)
            | Q(member_profile__phone_number__iexact=ident)
        ).distinct()

        candidates = list(qs)
        if not candidates:
            return None

        # Prefer the candidate whose password matches (handles duplicate first names)
        for u in candidates:
            if password and u.check_password(password):
                return u

        return candidates[0]

    def validate(self, attrs):
        raw_identifier = attrs.get(self.username_field, '')
        password = attrs.get('password', '')

        matched_user = self._resolve_user(raw_identifier, password)
        if matched_user is not None:
            attrs[self.username_field] = matched_user.username

        try:
            return super().validate(attrs)
        except AuthenticationFailed as e:
            if matched_user and not matched_user.is_active:
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
