from rest_framework import serializers
from .models import ClassRoom, Student
from members.serializers import MemberSerializer

class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(source='students.count', read_only=True)

    class Meta:
        model = ClassRoom
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    class_room_details = ClassRoomSerializer(source='class_room', read_only=True)
    parents_details = MemberSerializer(source='parents', many=True, read_only=True)
    
    # Accept a list of parent IDs during creation/update
    parent_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Student
        fields = '__all__'
        
    def create(self, validated_data):
        parent_ids = validated_data.pop('parent_ids', [])
        student = Student.objects.create(**validated_data)
        if parent_ids:
            student.parents.set(parent_ids)
        return student
        
    def update(self, instance, validated_data):
        parent_ids = validated_data.pop('parent_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if parent_ids is not None:
            instance.parents.set(parent_ids)
            
        return instance
