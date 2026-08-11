from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotebookViewSet, NoteViewSet, SourceViewSet, AIGenerationViewSet, QuizSetViewSet, QuizAttemptViewSet

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'sources', SourceViewSet, basename='source')
router.register(r'generations', AIGenerationViewSet, basename='generation')
router.register(r'quizzes', QuizSetViewSet, basename='quizset')
router.register(r'attempts', QuizAttemptViewSet, basename='quizattempt')

urlpatterns = [
    path('', include(router.urls)),
]
