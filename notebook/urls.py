from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotebookViewSet, NoteViewSet

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'notes', NoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
]
