from rest_framework.exceptions import APIException
from rest_framework import status
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notebook, Note, Source, AIGeneration

class NoteValidationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input.'
    default_code = 'invalid'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class NoteSerializer(serializers.ModelSerializer):
    initial_content = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Note
        fields = [
            'id', 'notebook', 'title', 'initial_content', 
            'revised_content', 'ai_rebuttal', 'is_locked', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['notebook', 'ai_rebuttal', 'is_locked', 'created_at', 'updated_at']

class NoteReviseSerializer(serializers.ModelSerializer):
    revised_content = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True
    )

    class Meta:
        model = Note
        fields = ['revised_content']

    def validate(self, attrs):
        # 1. Check if note is locked
        if self.instance and self.instance.is_locked:
            raise NoteValidationError(
                {"error": "This note is locked. You must submit your initial content and unlock it first."}
            )
            
        # 2. Check if revised_content is provided and non-empty
        revised_content = attrs.get('revised_content', '')
        if not revised_content.strip():
            raise NoteValidationError(
                {"error": "revised_content is required."}
            )
            
        return attrs


class SourceSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Source
        fields = ['id', 'notebook', 'title', 'source_type', 'content', 'file_path', 'url', 'created_at']
        read_only_fields = ['notebook', 'created_at']

class AIGenerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIGeneration
        fields = ['id', 'notebook', 'generation_type', 'content', 'created_at']
        read_only_fields = ['created_at']

class NotebookSerializer(serializers.ModelSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    sources = SourceSerializer(many=True, read_only=True)
    generations = AIGenerationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Notebook
        fields = ['id', 'user', 'name', 'description', 'notes', 'sources', 'generations', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']
