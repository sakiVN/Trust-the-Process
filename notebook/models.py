from django.db import models
from django.contrib.auth.models import User

class Notebook(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notebooks')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Note(models.Model):
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=255)
    initial_content = models.TextField()
    revised_content = models.TextField(blank=True, null=True)
    ai_rebuttal = models.TextField(blank=True, null=True)
    is_locked = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note: {self.title} in {self.notebook.name}"

class Source(models.Model):
    SOURCE_TYPES = [
        ('file', 'File'),
        ('link', 'Link'),
        ('text', 'Plain Text'),
    ]
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='sources')
    title = models.CharField(max_length=255)
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPES)
    content = models.TextField(help_text="Extracted text content from the source used for AI context.")
    file_path = models.FileField(upload_to='sources/', blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    category = models.CharField(max_length=50, default='all', help_text="Target category: quiz, flashcards, mind_map, report, or all.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.source_type})"

class QuizSet(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_sets')
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='quizzes', blank=True, null=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    tag = models.CharField(max_length=100, default='Bài tập trắc nghiệm')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Quiz: {self.name} ({self.user.username})"

class QuizQuestion(models.Model):
    quiz = models.ForeignKey(QuizSet, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    options = models.JSONField(default=list)
    correct_option = models.CharField(max_length=1)
    explanation = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order + 1}: {self.question_text[:50]}"

class QuizAttempt(models.Model):
    quiz = models.ForeignKey(QuizSet, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    score = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    percentage = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attempt {self.id} - {self.percentage:.1f}% on {self.quiz.name}"

class AIGeneration(models.Model):
    GENERATION_TYPES = [
        ('audio_overview', 'Audio Overview'),
        ('presentation', 'Presentation'),
        ('video_overview', 'Video Overview'),
        ('mind_map', 'Mind Map'),
        ('report', 'Report'),
        ('flashcards', 'Flashcards'),
        ('quiz', 'Quiz'),
        ('infographics', 'Infographics'),
        ('data_table', 'Data Table'),
    ]
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='generations', blank=True, null=True)
    generation_type = models.CharField(max_length=50, choices=GENERATION_TYPES)
    content = models.TextField(help_text="Stores the AI-generated output (can be text, markdown, or JSON).")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.generation_type} for {self.notebook.name}"
