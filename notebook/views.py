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
            
        # Collect sources: try specific category first, otherwise fallback to all notebook sources
        sources = notebook.sources.filter(category=generation_type)
        if not sources.exists():
            sources = notebook.sources.all()
            
        if not sources.exists():
            return Response(
                {"error": "Chưa có tài liệu liên quan nào trong sổ tay. Vui lòng tải tài liệu lên trước khi yêu cầu sinh nội dung!"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Build prompt context from sources
        sources_text = ""
        for src in sources:
            sources_text += f"--- SOURCE TITLE: {src.title} ---\nType: {src.source_type}\nContent:\n{src.content}\n\n"
            
        # Call AI generation service
        first_title = sources.first().title if sources.exists() else notebook.name
        language = request.data.get('language', 'vi')
        ai_content = ai_service.generate_notebook_materials(sources_text, generation_type, first_title, language=language)
        
        # Save generation to DB
        gen_obj = AIGeneration.objects.create(
            notebook=notebook,
            generation_type=generation_type,
            content=ai_content
        )
        
        # If generation is a Quiz, also automatically create/sync a QuizSet with QuizQuestions
        if generation_type == 'quiz':
            try:
                import json
                clean_content = ai_content.strip()
                if clean_content.startswith("```"):
                    clean_content = re.sub(r'^```(?:json)?\s*', '', clean_content)
                    clean_content = re.sub(r'```$', '', clean_content).strip()
                
                # Try json parse
                questions_list = []
                try:
                    questions_list = json.loads(clean_content)
                except Exception:
                    pass

                if isinstance(questions_list, list) and len(questions_list) > 0:
                    user = request.user if request.user.is_authenticated else notebook.user
                    quiz_set = QuizSet.objects.create(
                        user=user,
                        notebook=notebook,
                        name=f"Trắc nghiệm: {first_title}",
                        description=f"Bài tập trắc nghiệm sinh tự động từ tài liệu: {first_title}",
                        tag="Bài tập trắc nghiệm"
                    )
                    for idx, q_data in enumerate(questions_list):
                        q_text = q_data.get('question') or q_data.get('question_text', '')
                        options = q_data.get('options', [])
                        corr = q_data.get('correct_option') or q_data.get('answer', 'A')
                        if isinstance(corr, int) and 0 <= corr < len(options):
                            corr = chr(65 + corr)
                        corr = str(corr).upper()
                        exp = q_data.get('explanation', '')
                        if q_text and options:
                            QuizQuestion.objects.create(
                                quiz=quiz_set,
                                question_text=q_text,
                                options=options,
                                correct_option=corr,
                                explanation=exp,
                                order=idx
                            )
            except Exception as e:
                # Log but do not fail generation response
                print("Auto-create QuizSet error:", e)
        
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
        language = request.data.get('language', 'vi')
        
        if not initial_content:
            return Response({"error": "initial_content is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Optional validation: character length to force deep thinking
        if len(initial_content) < 20:
            return Response(
                {"error": "Your initial opinion is too short (minimum 20 characters). Please write more to unlock the AI rebuttal."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Generate the rebuttal
        ai_rebuttal = ai_service.generate_rebuttal(initial_content, language=language)
        
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


import re
import json

class SourceViewSet(viewsets.ModelViewSet):
    serializer_class = SourceSerializer
    queryset = Source.objects.all()

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Source.objects.filter(notebook__user=self.request.user)
        return Source.objects.all()

    @action(detail=True, methods=['post'], url_path='generate_quiz')
    def generate_quiz(self, request, pk=None):
        """
        Generate AI Quiz directly from this specific source and save to QuizSet and AIGeneration.
        """
        source = self.get_object()
        notebook = source.notebook
        language = request.data.get('language', 'vi')
        
        sources_text = f"--- SOURCE TITLE: {source.title} ---\nType: {source.source_type}\nContent:\n{source.content}\n\n"
        ai_content = ai_service.generate_notebook_materials(sources_text, 'quiz', source.title, language=language)
        
        # Save to AIGeneration
        gen_obj = AIGeneration.objects.create(
            notebook=notebook,
            generation_type='quiz',
            content=ai_content
        )
        
        # Parse and save to QuizSet
        quiz_set = None
        try:
            clean_content = ai_content.strip()
            if clean_content.startswith("```"):
                clean_content = re.sub(r'^```(?:json)?\s*', '', clean_content)
                clean_content = re.sub(r'```$', '', clean_content).strip()
            questions_list = json.loads(clean_content)
            if isinstance(questions_list, list) and len(questions_list) > 0:
                user = request.user if request.user.is_authenticated else (notebook.user if notebook else None)
                if not user:
                    user, _ = User.objects.get_or_create(username='student', email='student@example.com')
                
                quiz_set = QuizSet.objects.create(
                    user=user,
                    notebook=notebook,
                    name=f"Trắc nghiệm: {source.title}",
                    description=f"Bài tập trắc nghiệm tự động sinh từ tài liệu: {source.title}",
                    tag="Bài tập trắc nghiệm"
                )
                for idx, q_data in enumerate(questions_list):
                    q_text = q_data.get('question') or q_data.get('question_text', '')
                    options = q_data.get('options', [])
                    corr = q_data.get('correct_option') or q_data.get('answer', 'A')
                    if isinstance(corr, int) and 0 <= corr < len(options):
                        corr = chr(65 + corr)
                    corr = str(corr).upper()
                    exp = q_data.get('explanation', '')
                    if q_text and options:
                        QuizQuestion.objects.create(
                            quiz=quiz_set,
                            question_text=q_text,
                            options=options,
                            correct_option=corr,
                            explanation=exp,
                            order=idx
                        )
        except Exception as e:
            print("Error creating QuizSet from source:", e)
            
        return Response({
            'generation': AIGenerationSerializer(gen_obj).data,
            'quiz_set': QuizSetSerializer(quiz_set).data if quiz_set else None
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='generate_flashcards')
    def generate_flashcards(self, request, pk=None):
        """
        Generate AI Flashcards directly from this specific source and save to AIGeneration.
        """
        source = self.get_object()
        notebook = source.notebook
        language = request.data.get('language', 'vi')
        
        sources_text = f"--- SOURCE TITLE: {source.title} ---\nType: {source.source_type}\nContent:\n{source.content}\n\n"
        ai_content = ai_service.generate_notebook_materials(sources_text, 'flashcards', source.title, language=language)
        
        gen_obj = AIGeneration.objects.create(
            notebook=notebook,
            generation_type='flashcards',
            content=ai_content
        )
        
        return Response({
            'generation': AIGenerationSerializer(gen_obj).data
        }, status=status.HTTP_201_CREATED)


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

    @action(detail=True, methods=['post'], url_path='convert_to_quiz')
    def convert_to_quiz(self, request, pk=None):
        """
        Convert this AI generation into a persistent QuizSet with QuizQuestions.
        """
        gen = self.get_object()
        notebook = gen.notebook
        clean_content = gen.content.strip()
        if clean_content.startswith("```"):
            clean_content = re.sub(r'^```(?:json)?\s*', '', clean_content)
            clean_content = re.sub(r'```$', '', clean_content).strip()
        
        try:
            questions_list = json.loads(clean_content)
            if not isinstance(questions_list, list) or len(questions_list) == 0:
                return Response({'error': 'No questions found in this generation.'}, status=status.HTTP_400_BAD_REQUEST)
            
            user = request.user if request.user.is_authenticated else (notebook.user if notebook else None)
            if not user:
                user, _ = User.objects.get_or_create(username='student', email='student@example.com')
                
            quiz_set = QuizSet.objects.create(
                user=user,
                notebook=notebook,
                name=f"Bộ câu hỏi đã chuyển đổi (#{gen.id})",
                description=f"Chuyển đổi từ tài liệu ôn tập AI đã lưu.",
                tag="Bài tập trắc nghiệm"
            )
            for idx, q_data in enumerate(questions_list):
                q_text = q_data.get('question') or q_data.get('question_text', '')
                options = q_data.get('options', [])
                corr = q_data.get('correct_option') or q_data.get('answer', 'A')
                if isinstance(corr, int) and 0 <= corr < len(options):
                    corr = chr(65 + corr)
                corr = str(corr).upper()
                exp = q_data.get('explanation', '')
                if q_text and options:
                    QuizQuestion.objects.create(
                        quiz=quiz_set,
                        question_text=q_text,
                        options=options,
                        correct_option=corr,
                        explanation=exp,
                        order=idx
                    )
            return Response(QuizSetSerializer(quiz_set).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Failed to parse questions: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.decorators import api_view
from django.utils import timezone
from datetime import timedelta

@api_view(['GET'])
def get_dashboard_notifications(request):
    user = request.user if request.user.is_authenticated else User.objects.filter(username='student').first()
    if not user:
        return Response([])

    lang = request.query_params.get('lang', 'vi')
    notifications = []
    now = timezone.now()
    
    # 1. Weekly Digest
    week_ago = now - timedelta(days=7)
    ai_count = AIGeneration.objects.filter(notebook__user=user, created_at__gte=week_ago).count()
    quiz_count = QuizAttempt.objects.filter(user=user, created_at__gte=week_ago).count()
    if ai_count > 0 or quiz_count > 0:
        if lang == 'jp':
            title = '週間レポート'
            message = f'過去7日間に{ai_count}件の学習教材を作成し、{quiz_count}回のクイズを完了しました。'
        elif lang == 'en':
            title = 'Weekly Digest'
            message = f'In the last 7 days, you created {ai_count} AI materials and completed {quiz_count} quizzes.'
        else:
            title = 'Báo cáo tuần'
            message = f'7 ngày qua, bạn đã tạo {ai_count} tài liệu tự động và làm {quiz_count} bài Quiz.'

        notifications.append({
            'type': 'digest',
            'icon': '📊',
            'title': title,
            'message': message,
            'color': 'indigo'
        })
        
    # 2. Adaptive Learning
    latest_attempt = QuizAttempt.objects.filter(user=user).order_by('-created_at').first()
    if latest_attempt:
        if latest_attempt.percentage < 50:
            if lang == 'jp':
                title = '学習アドバイス'
                message = f'直近のクイズ「{latest_attempt.quiz.name}」の得点は{latest_attempt.percentage}%でした。マインドマップを作成して要点を整理してみましょう！'
            elif lang == 'en':
                title = 'Study Recommendation'
                message = f'Your recent score on "{latest_attempt.quiz.name}" was {latest_attempt.percentage}%. Try generating a Mind Map to reinforce core concepts!'
            else:
                title = 'Gợi ý học tập'
                message = f'Bài Quiz "{latest_attempt.quiz.name}" gần nhất điểm khá thấp ({latest_attempt.percentage}%). Hãy thử tạo Sơ đồ tư duy để nắm ý chính nhé!'

            notifications.append({
                'type': 'warning',
                'icon': '🎯',
                'title': title,
                'message': message,
                'color': 'rose'
            })
        elif latest_attempt.percentage == 100:
            if lang == 'jp':
                title = '素晴らしい！'
                message = f'「{latest_attempt.quiz.name}」で満点を獲得しました！よく頑張りました。'
            elif lang == 'en':
                title = 'Excellent!'
                message = f'You achieved a perfect score on "{latest_attempt.quiz.name}". Great job!'
            else:
                title = 'Xuất sắc!'
                message = f'Bạn đã đạt điểm tuyệt đối bài "{latest_attempt.quiz.name}". Rất đáng khen!'

            notifications.append({
                'type': 'success',
                'icon': '🏆',
                'title': title,
                'message': message,
                'color': 'emerald'
            })
            
    # 3. Spaced Repetition (Quiz created > 1 day ago, no attempts in last 24h)
    yesterday = now - timedelta(days=1)
    old_quizzes = QuizSet.objects.filter(user=user, created_at__lte=yesterday).order_by('-created_at')[:3]
    for q in old_quizzes:
        recent_attempt = QuizAttempt.objects.filter(quiz=q, created_at__gte=yesterday).exists()
        if not recent_attempt:
            if lang == 'jp':
                title = '復習リマインダー'
                message = f'「{q.name}」の前回学習から24時間以上経過しました。テストを受けて記憶を定着させましょう！'
            elif lang == 'en':
                title = 'Review Due'
                message = f'It has been over 24h since you last reviewed "{q.name}". Take a quick quiz to reinforce memory!'
            else:
                title = 'Đến hạn ôn tập'
                message = f'Đã hơn 24h bạn chưa ôn lại "{q.name}". Làm thử 1 bài Test để củng cố trí nhớ nào!'

            notifications.append({
                'type': 'reminder',
                'icon': '🧠',
                'title': title,
                'message': message,
                'color': 'orange'
            })
            break # just 1 reminder is enough
            
    # 4. Streak
    if latest_attempt and latest_attempt.created_at >= yesterday:
        if lang == 'jp':
            title = '学習ストリーク'
            message = '学習習慣が継続しています。この調子で続けましょう！'
        elif lang == 'en':
            title = 'Learning Streak'
            message = 'You are maintaining a great learning streak, keep it up!'
        else:
            title = 'Chuỗi học tập'
            message = 'Bạn đang duy trì chuỗi học tập rất tốt, đừng để đứt chuỗi nhé!'

        notifications.append({
            'type': 'streak',
            'icon': '🔥',
            'title': title,
            'message': message,
            'color': 'amber'
        })
    elif not latest_attempt or latest_attempt.created_at < yesterday:
        if lang == 'jp':
            title = 'ストリーク警告'
            message = '本日はまだ演習を行っていません。簡単なクイズを解いて継続記録を守りましょう！'
        elif lang == 'en':
            title = 'Streak Risk'
            message = "You haven't completed any quizzes today. Take a quick quiz to maintain your streak!"
        else:
            title = 'Nguy cơ đứt chuỗi'
            message = 'Hôm nay bạn chưa làm bài tập nào. Hãy làm 1 bài Quiz ngắn để duy trì chuỗi nhé!'

        notifications.append({
            'type': 'streak',
            'icon': '⚠️',
            'title': title,
            'message': message,
            'color': 'slate'
        })

    return Response(notifications)


@api_view(['POST'])
def context_action(request):
    """
    Handle Contextual AI toolbar actions (explain, translate, flashcard)
    from highlighted text in documents.
    """
    text = request.data.get('text', '').strip()
    action_type = request.data.get('action', 'explain')
    notebook_id = request.data.get('notebook_id')
    language = request.data.get('language', 'vi')

    if not text:
        return Response({'error': 'No text provided.'}, status=status.HTTP_400_BAD_REQUEST)

    result_data = ai_service.process_context_action(text, action_type, language=language)

    # If action is flashcard and notebook_id is provided, optionally save to database
    if action_type == 'flashcard' and result_data.get('flashcard') and notebook_id:
        try:
            notebook = Notebook.objects.filter(pk=notebook_id).first()
            if notebook:
                card = result_data['flashcard']
                # Check existing flashcards generation
                existing_gen = AIGeneration.objects.filter(notebook=notebook, generation_type='flashcards').first()
                if existing_gen:
                    try:
                        cards = json.loads(existing_gen.content)
                        if isinstance(cards, list):
                            cards.append(card)
                            existing_gen.content = json.dumps(cards, ensure_ascii=False)
                            existing_gen.save()
                    except Exception:
                        pass
                else:
                    AIGeneration.objects.create(
                        notebook=notebook,
                        generation_type='flashcards',
                        content=json.dumps([card], ensure_ascii=False)
                    )
                result_data['saved_to_notebook'] = True
        except Exception as e:
            result_data['save_error'] = str(e)

    return Response(result_data, status=status.HTTP_200_OK)

