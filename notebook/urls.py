from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotebookViewSet, NoteViewSet, SourceViewSet, AIGenerationViewSet

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'sources', SourceViewSet, basename='source')
router.register(r'generations', AIGenerationViewSet, basename='generation')

urlpatterns = [
    path('', include(router.urls)),
]
