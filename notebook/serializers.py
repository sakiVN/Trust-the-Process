from rest_framework.exceptions import APIException
from rest_framework import status
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notebook, Note, Source, AIGeneration, QuizSet, QuizQuestion, QuizAttempt, FlashcardSet, Flashcard

class NoteValidationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input.'
    default_code = 'invalid'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email','first_name','last_name']

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
        fields = ['id', 'notebook', 'title', 'source_type', 'content', 'file_path', 'url', 'category', 'created_at']
        read_only_fields = ['notebook', 'created_at']

class AIGenerationSerializer(serializers.ModelSerializer):
    notebook = serializers.PrimaryKeyRelatedField(queryset=Notebook.objects.all(), required=False, allow_null=True)

    class Meta:
        model = AIGeneration
        fields = ['id', 'notebook', 'generation_type', 'content', 'created_at']
        read_only_fields = ['created_at']

    def validate_notebook(self, value):
        if value == '':
            return None
        return value

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'options', 'correct_option', 'explanation', 'order']
        read_only_fields = ['id', 'order']

class QuizSetSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, required=False)
    attempts_count = serializers.IntegerField(source='attempts.count', read_only=True)

    class Meta:
        model = QuizSet
        fields = ['id', 'user', 'notebook', 'name', 'description', 'tag', 'questions', 'attempts_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'attempts_count']

    def validate(self, attrs):
        questions_data = attrs.get('questions', [])
        if questions_data is not None and len(questions_data) > 50:
            raise serializers.ValidationError({
                'questions': 'Bộ câu hỏi không được vượt quá 50 câu hỏi.'
            })
        notebook = attrs.get('notebook')
        if notebook == '':
            attrs['notebook'] = None
        return attrs

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz_set = QuizSet.objects.create(**validated_data)
        for idx, question_data in enumerate(questions_data):
            QuizQuestion.objects.create(quiz=quiz_set, order=idx, **question_data)
        return quiz_set

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if questions_data is not None:
            instance.questions.all().delete()
            for idx, question_data in enumerate(questions_data):
                QuizQuestion.objects.create(quiz=instance, order=idx, **question_data)

        return instance

class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz', 'user', 'score', 'total', 'percentage', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', 'question', 'answer', 'order']
        read_only_fields = ['id', 'order']

class FlashcardSetSerializer(serializers.ModelSerializer):
    flashcards = FlashcardSerializer(many=True, required=False)

    class Meta:
        model = FlashcardSet
        fields = ['id', 'user', 'notebook', 'name', 'description', 'flashcards', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']

    def validate(self, attrs):
        notebook = attrs.get('notebook')
        if notebook == '':
            attrs['notebook'] = None
        return attrs

    def create(self, validated_data):
        flashcards_data = validated_data.pop('flashcards', [])
        flashcard_set = FlashcardSet.objects.create(**validated_data)
        for idx, card_data in enumerate(flashcards_data):
            Flashcard.objects.create(flashcard_set=flashcard_set, order=idx, **card_data)
        return flashcard_set

    def update(self, instance, validated_data):
        flashcards_data = validated_data.pop('flashcards', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if flashcards_data is not None:
            instance.flashcards.all().delete()
            for idx, card_data in enumerate(flashcards_data):
                Flashcard.objects.create(flashcard_set=instance, order=idx, **card_data)

        return instance

class NotebookSerializer(serializers.ModelSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    sources = SourceSerializer(many=True, read_only=True)
    generations = AIGenerationSerializer(many=True, read_only=True)
    quizzes = QuizSetSerializer(many=True, read_only=True)
    flashcard_sets = FlashcardSetSerializer(many=True, read_only=True)
    
    class Meta:
        model = Notebook
        fields = ['id', 'user', 'name', 'description', 'notes', 'sources', 'generations', 'quizzes', 'flashcard_sets', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']
