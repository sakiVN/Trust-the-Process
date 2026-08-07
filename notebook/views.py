from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Notebook, Note, Source, AIGeneration
from .serializers import (
    NotebookSerializer, NoteSerializer, SourceSerializer, AIGenerationSerializer
)
from . import ai_service

class NotebookViewSet(viewsets.ModelViewSet):
    serializer_class = NotebookSerializer
    queryset = Notebook.objects.all().order_by('-created_at')

    def get_queryset(self):
        # Fallback to default user if not authenticated for easy API testing
        if self.request.user.is_authenticated:
            return Notebook.objects.filter(user=self.request.user).order_by('-created_at')
        return Notebook.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            # Fallback user for testing
            user, created = User.objects.get_or_create(username='student', email='student@example.com')
            serializer.save(user=user)

    @action(detail=True, methods=['post'], url_path='sources')
    def add_source(self, request, pk=None):
        """
        Add a source (file, link, or text) to the notebook.
        """
        notebook = self.get_object()
        serializer = SourceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(notebook=notebook)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='notes')
    def add_note(self, request, pk=None):
        """
        Add a note (journal draft) to the notebook.
        """
        notebook = self.get_object()
        serializer = NoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(notebook=notebook, is_locked=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='generate')
    def generate_material(self, request, pk=None):
        """
        Generate study materials (quiz, flashcards, mind_map, etc.) based on all sources.
        """
        notebook = self.get_object()
        generation_type = request.data.get('generation_type')
        
        valid_types = [t[0] for t in AIGeneration.GENERATION_TYPES]
        if not generation_type or generation_type not in valid_types:
            return Response(
                {"error": f"Invalid or missing generation_type. Must be one of: {', '.join(valid_types)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Collect all sources text
        sources = notebook.sources.all()
        if not sources.exists():
            return Response(
                {"error": "No source materials found in this notebook. Please add sources first before generating AI content."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Build prompt context from all sources
        sources_text = ""
        for src in sources:
            sources_text += f"--- SOURCE TITLE: {src.title} ---\nType: {src.source_type}\nContent:\n{src.content}\n\n"
            
        # Call AI generation service
        ai_content = ai_service.generate_notebook_materials(sources_text, generation_type)
        
        # Save generation to DB
        gen_obj = AIGeneration.objects.create(
            notebook=notebook,
            generation_type=generation_type,
            content=ai_content
        )
        
        serializer = AIGenerationSerializer(gen_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    queryset = Note.objects.all().order_by('-created_at')

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        """
        Submit initial thought, run AI rebuttal, and unlock the note.
        """
        note = self.get_object()
        initial_content = request.data.get('initial_content', '').strip()
        
        if not initial_content:
            return Response({"error": "initial_content is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Optional validation: character length to force deep thinking
        if len(initial_content) < 20:
            return Response(
                {"error": "Your initial opinion is too short (minimum 20 characters). Please write more to unlock the AI rebuttal."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Generate the rebuttal
        ai_rebuttal = ai_service.generate_rebuttal(initial_content)
        
        # Update note properties
        note.initial_content = initial_content
        note.ai_rebuttal = ai_rebuttal
        note.is_locked = False
        note.save()
        
        serializer = self.get_serializer(note)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def revise(self, request, pk=None):
        """
        Save the student's revised thought after reviewing the AI rebuttal.
        """
        note = self.get_object()
        
        if note.is_locked:
            return Response(
                {"error": "This note is locked. You must submit your initial content and unlock it first."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        revised_content = request.data.get('revised_content', '').strip()
        if not revised_content:
            return Response({"error": "revised_content is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        note.revised_content = revised_content
        note.save()
        
        serializer = self.get_serializer(note)
        return Response(serializer.data, status=status.HTTP_200_OK)
