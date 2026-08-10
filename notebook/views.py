from typing import Optional, Any
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from django.contrib.auth.models import User
from .models import Notebook, Note, Source, AIGeneration
from .serializers import (
    NotebookSerializer, NoteSerializer, SourceSerializer, AIGenerationSerializer,
    NoteReviseSerializer
)
from . import ai_service
import pypdf

def extract_text_from_pdf(file_obj) -> str:
    """
    Extract text content from an uploaded PDF file object using pypdf.
    """
    try:
        reader = pypdf.PdfReader(file_obj)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        return f"Error extracting text from PDF: {str(e)}"


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
            source_type = serializer.validated_data.get('source_type')
            
            # If source_type is file, check if file_path exists in request.FILES
            if source_type == 'file':
                uploaded_file = request.FILES.get('file_path')
                if not uploaded_file:
                    return Response(
                        {"error": "file_path is required when source_type is file."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Extract text
                extracted_text = extract_text_from_pdf(uploaded_file)
                serializer.validated_data['content'] = extracted_text
                
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
            
        # Collect sources specific to the requested generation type/category
        sources = notebook.sources.filter(category=generation_type)
        if not sources.exists():
            return Response(
                {"error": f"Không tìm thấy tài liệu nguồn nào cho phần ôn tập này. Vui lòng tải tài liệu lên trước khi yêu cầu sinh nội dung!"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Build prompt context from filtered sources
        sources_text = ""
        for src in sources:
            sources_text += f"--- SOURCE TITLE: {src.title} ---\nType: {src.source_type}\nContent:\n{src.content}\n\n"
            
        # Call AI generation service with source title for dynamic mock data
        first_title = sources.first().title
        ai_content = ai_service.generate_notebook_materials(sources_text, generation_type, first_title)
        
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
    def revise(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        Save the student's revised thought after reviewing the AI rebuttal.

        Args:
            request (Request): The HTTP request containing 'revised_content'.
            pk (Optional[str]): The primary key of the note.

        Returns:
            Response: The HTTP response with the serialized Note data.

        Raises:
            ValidationError: If validation fails (e.g. note is locked or content is empty).
            Http404: If the note does not exist.
        """
        note = self.get_object()
        serializer = NoteReviseSerializer(instance=note, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        response_serializer = self.get_serializer(note)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class SourceViewSet(viewsets.ModelViewSet):
    serializer_class = SourceSerializer
    queryset = Source.objects.all()

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Source.objects.filter(notebook__user=self.request.user)
        return Source.objects.all()


class AIGenerationViewSet(viewsets.ModelViewSet):
    serializer_class = AIGenerationSerializer
    queryset = AIGeneration.objects.all()

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return AIGeneration.objects.filter(notebook__user=self.request.user)
        return AIGeneration.objects.all()
