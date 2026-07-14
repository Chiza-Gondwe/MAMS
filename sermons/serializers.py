from rest_framework import serializers
from .models import Sermon

class SermonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sermon
        fields = '__all__'
        read_only_fields = ['church', 'created_at']
