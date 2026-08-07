from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notebook, Note, Source, AIGeneration

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            'id', 'notebook', 'title', 'initial_content', 
            'revised_content', 'ai_rebuttal', 'is_locked', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['notebook', 'ai_rebuttal', 'is_locked', 'created_at', 'updated_at']

class SourceSerializer(serializers.ModelSerializer):
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
