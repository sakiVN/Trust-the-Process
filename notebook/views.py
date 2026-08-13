from typing import Optional, Any
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from django.contrib.auth.models import User
from .models import Notebook, Note, Source, AIGeneration, QuizSet, QuizQuestion, QuizAttempt
from .serializers import (
    NotebookSerializer, NoteSerializer, SourceSerializer, AIGenerationSerializer,
    NoteReviseSerializer, QuizSetSerializer, QuizQuestionSerializer, QuizAttemptSerializer
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
                {"error": f"Không tìm thấy tài liệu liên quan nào cho phần ôn tập này. Vui lòng tải tài liệu lên trước khi yêu cầu sinh nội dung!"},
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


class QuizSetViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSetSerializer
    queryset = QuizSet.objects.all().order_by('-created_at')

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return QuizSet.objects.filter(user=self.request.user).order_by('-created_at')
        return QuizSet.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            user, created = User.objects.get_or_create(username='student', email='student@example.com')
            serializer.save(user=user)

    @action(detail=True, methods=['post'], url_path='shuffle')
    def shuffle_questions(self, request, pk=None):
        quiz = self.get_object()
        questions = list(quiz.questions.all())
        from random import shuffle
        shuffle(questions)
        serialized = QuizQuestionSerializer(questions, many=True)
        return Response(serialized.data, status=status.HTTP_200_OK)

class QuizAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = QuizAttemptSerializer
    queryset = QuizAttempt.objects.all().order_by('-created_at')

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return QuizAttempt.objects.filter(user=self.request.user).order_by('-created_at')
        return QuizAttempt.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            user, created = User.objects.get_or_create(username='student', email='student@example.com')
            serializer.save(user=user)

    @action(detail=False, methods=['post'], url_path='submit')
    def submit_attempt(self, request):
        quiz_id = request.data.get('quiz')
        user_answers = request.data.get('answers', {})

        if not quiz_id:
            return Response({'error': 'quiz is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quiz = QuizSet.objects.get(pk=quiz_id)
        except QuizSet.DoesNotExist:
            return Response({'error': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)

        questions = list(quiz.questions.all())
        if not questions:
            return Response({'error': 'Quiz has no questions.'}, status=status.HTTP_400_BAD_REQUEST)

        score = 0
        total = len(questions)
        results = []
        for question in questions:
            selected = user_answers.get(str(question.id), '').strip().upper()
            is_correct = selected == question.correct_option.upper()
            if is_correct:
                score += 1
            results.append({
                'question_id': question.id,
                'selected': selected,
                'correct': question.correct_option.upper(),
                'is_correct': is_correct,
                'explanation': question.explanation or ''
            })

        percentage = round((score / total) * 100, 1) if total else 0.0
        if request.user.is_authenticated:
            user = request.user
        else:
            user, created = User.objects.get_or_create(username='student', email='student@example.com')

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=user,
            score=score,
            total=total,
            percentage=percentage
        )

        return Response({
            'attempt': QuizAttemptSerializer(attempt).data,
            'results': results,
            'score': score,
            'total': total,
            'percentage': percentage
        }, status=status.HTTP_201_CREATED)

class AIGenerationViewSet(viewsets.ModelViewSet):
    serializer_class = AIGenerationSerializer
    queryset = AIGeneration.objects.all()

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return AIGeneration.objects.filter(notebook__user=self.request.user)
        return AIGeneration.objects.all()

from rest_framework.decorators import api_view
from django.utils import timezone
from datetime import timedelta

@api_view(['GET'])
def get_dashboard_notifications(request):
    user = request.user if request.user.is_authenticated else User.objects.filter(username='student').first()
    if not user:
        return Response([])

    notifications = []
    now = timezone.now()
    
    # 1. Weekly Digest
    week_ago = now - timedelta(days=7)
    ai_count = AIGeneration.objects.filter(notebook__user=user, created_at__gte=week_ago).count()
    quiz_count = QuizAttempt.objects.filter(user=user, created_at__gte=week_ago).count()
    if ai_count > 0 or quiz_count > 0:
        notifications.append({
            'type': 'digest',
            'icon': '📊',
            'title': 'Báo cáo tuần',
            'message': f'7 ngày qua, bạn đã tạo {ai_count} tài liệu tự động và làm {quiz_count} bài Quiz.',
            'color': 'indigo'
        })
        
    # 2. Adaptive Learning
    latest_attempt = QuizAttempt.objects.filter(user=user).order_by('-created_at').first()
    if latest_attempt:
        if latest_attempt.percentage < 50:
            notifications.append({
                'type': 'warning',
                'icon': '🎯',
                'title': 'Gợi ý học tập',
                'message': f'Bài Quiz "{latest_attempt.quiz.name}" gần nhất điểm khá thấp ({latest_attempt.percentage}%). Hãy thử tạo Sơ đồ tư duy để nắm ý chính nhé!',
                'color': 'rose'
            })
        elif latest_attempt.percentage == 100:
            notifications.append({
                'type': 'success',
                'icon': '🏆',
                'title': 'Xuất sắc!',
                'message': f'Bạn đã đạt điểm tuyệt đối bài "{latest_attempt.quiz.name}". Rất đáng khen!',
                'color': 'emerald'
            })
            
    # 3. Spaced Repetition (Quiz created > 1 day ago, no attempts in last 24h)
    yesterday = now - timedelta(days=1)
    old_quizzes = QuizSet.objects.filter(user=user, created_at__lte=yesterday).order_by('-created_at')[:3]
    for q in old_quizzes:
        recent_attempt = QuizAttempt.objects.filter(quiz=q, created_at__gte=yesterday).exists()
        if not recent_attempt:
            notifications.append({
                'type': 'reminder',
                'icon': '🧠',
                'title': 'Đến hạn ôn tập',
                'message': f'Đã hơn 24h bạn chưa ôn lại "{q.name}". Làm thử 1 bài Test để củng cố trí nhớ nào!',
                'color': 'orange'
            })
            break # just 1 reminder is enough
            
    # 4. Streak
    if latest_attempt and latest_attempt.created_at >= yesterday:
        notifications.append({
            'type': 'streak',
            'icon': '🔥',
            'title': 'Chuỗi học tập',
            'message': 'Bạn đang duy trì chuỗi học tập rất tốt, đừng để đứt chuỗi nhé!',
            'color': 'amber'
        })
    elif not latest_attempt or latest_attempt.created_at < yesterday:
         notifications.append({
            'type': 'streak',
            'icon': '⚠️',
            'title': 'Nguy cơ đứt chuỗi',
            'message': 'Hôm nay bạn chưa làm bài tập nào. Hãy làm 1 bài Quiz ngắn để duy trì chuỗi nhé!',
            'color': 'slate'
        })

    return Response(notifications)


from .features.contextual import service as contextual_service

@api_view(['POST'])
def process_context_action(request):
    text = request.data.get('text', '')
    action_type = request.data.get('action', '')
    notebook_id = request.data.get('notebook_id')
    
    if not text or not action_type:
        return Response({'error': 'Missing text or action'}, status=status.HTTP_400_BAD_REQUEST)
        
    result = contextual_service.process_context_action(text, action_type, notebook_id=notebook_id)
    return Response({'result': result})
