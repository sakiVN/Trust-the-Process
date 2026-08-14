from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotebookViewSet, NoteViewSet, SourceViewSet, AIGenerationViewSet, QuizSetViewSet, QuizAttemptViewSet, FlashcardSetViewSet, get_dashboard_notifications, process_context_action, update_profile

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'sources', SourceViewSet, basename='source')
router.register(r'generations', AIGenerationViewSet, basename='generation')
router.register(r'quizzes', QuizSetViewSet, basename='quizset')
router.register(r'attempts', QuizAttemptViewSet, basename='quizattempt')
router.register(r'flashcard_sets', FlashcardSetViewSet, basename='flashcardset')

urlpatterns = [
    path('dashboard/notifications/', get_dashboard_notifications, name='dashboard-notifications'),
    path('ai/context_action/', process_context_action, name='context-action'),
    path('users/me/', update_profile, name='update-profile'),
    path('', include(router.urls)),
]
