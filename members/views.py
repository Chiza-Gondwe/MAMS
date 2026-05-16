from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Member
from .serializers import MemberSerializer, RegisterMemberSerializer
from .permissions import IsAdmin, IsMember

class MemberViewSet(viewsets.ModelViewSet):
    serializer_class = MemberSerializer

    def get_queryset(self):
        queryset = Member.objects.all()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
            
        profile = getattr(user, 'member_profile', None)
        if not profile:
            return queryset.none()
            
        if profile.role in ['admin', 'pta']:
            return queryset
        return queryset.filter(id=profile.id)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

@api_view(['POST'])
@permission_classes([AllowAny])
def register_member(request):
    serializer = RegisterMemberSerializer(data=request.data)
    if serializer.is_valid():
        member = serializer.save()
        return Response({
            'message': 'Registration successful. Welcome to MAMS.',
            'member': MemberSerializer(member).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)