from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Notebook, Note, Source, AIGeneration

class NotebookModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='teststudent', password='testpassword')
        self.notebook = Notebook.objects.create(
            user=self.user,
            name="Lịch Sử Việt Nam",
            description="Tìm hiểu về lịch sử các triều đại Việt Nam."
        )

    def test_notebook_creation(self):
        """Verify that a notebook is created correctly with default fields."""
        self.assertEqual(self.notebook.name, "Lịch Sử Việt Nam")
        self.assertEqual(self.notebook.user.username, "teststudent")
        self.assertIsNotNone(self.notebook.created_at)

    def test_note_locking_flow(self):
        """Test the lifecycle of a note: starting locked, then unlocking with AI rebuttal, then revising."""
        note = Note.objects.create(
            notebook=self.notebook,
            title="Ý kiến về chiến dịch Điện Biên Phủ",
            initial_content="Điện Biên Phủ là chiến thắng vang dội lừng lẫy năm châu chấn động địa cầu.",
            is_locked=True
        )
        
        self.assertTrue(note.is_locked)
        self.assertIsNone(note.ai_rebuttal)
        
        # Unlock note and inject rebuttal
        from . import ai_service
        rebuttal = ai_service.generate_rebuttal(note.initial_content)
        note.ai_rebuttal = rebuttal
        note.is_locked = False
        note.save()
        
        self.assertFalse(note.is_locked)
        self.assertIsNotNone(note.ai_rebuttal)
        
        # Submit revised thought
        note.revised_content = "Dưới sự lãnh đạo của Đại tướng Võ Nguyên Giáp, chiến thuật bao vây kéo dài đã thành công."
        note.save()
        self.assertEqual(note.revised_content, "Dưới sự lãnh đạo của Đại tướng Võ Nguyên Giáp, chiến thuật bao vây kéo dài đã thành công.")


class NotebookAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='apistudent', password='apipassword')
        self.client.force_authenticate(user=self.user)
        
        self.notebook = Notebook.objects.create(
            user=self.user,
            name="Học Tập Tích Hợp AI",
            description="Dự án test các APIs"
        )
        self.note = Note.objects.create(
            notebook=self.notebook,
            title="Định nghĩa ban đầu",
            initial_content="Suy nghĩ ban đầu của học sinh",
            is_locked=True
        )

    def test_list_notebooks(self):
        """API: List notebooks of authenticated user."""
        url = reverse('notebook-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Học Tập Tích Hợp AI")

    def test_create_notebook(self):
        """API: Create a new notebook."""
        url = reverse('notebook-list')
        data = {'name': 'Toán Học Rời Rạc', 'description': 'Lý thuyết đồ thị và logic'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notebook.objects.count(), 2)

    def test_add_source(self):
        """API: Add a source document to a notebook."""
        url = reverse('notebook-add-source', kwargs={'pk': self.notebook.pk})
        data = {
            'title': 'Tài liệu Python cơ bản',
            'source_type': 'text',
            'content': 'Python là một ngôn ngữ lập trình đa năng, hướng đối tượng và dễ học.'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Source.objects.count(), 1)
        self.assertEqual(Source.objects.first().title, 'Tài liệu Python cơ bản')

    def test_note_unlock_api(self):
        """API: Submit thought and unlock note with AI rebuttal."""
        url = reverse('note-unlock', kwargs={'pk': self.note.pk})
        data = {
            'initial_content': 'Đây là suy nghĩ của học sinh về cách hoạt động của hệ thống giáo dục hiện đại.'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_locked'])
        self.assertIsNotNone(response.data['ai_rebuttal'])

    def test_note_unlock_api_validation(self):
        """API: Ensure note unlocking fails with too short initial thought."""
        url = reverse('note-unlock', kwargs={'pk': self.note.pk})
        data = {
            'initial_content': 'Ngắn quá'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_generate_material_api_no_sources(self):
        """API: Verify AI generation fails if no source documents are registered."""
        url = reverse('notebook-generate-material', kwargs={'pk': self.notebook.pk})
        data = {'generation_type': 'quiz'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_generate_material_api_success(self):
        """API: Verify AI generation succeeds (runs mock generation) when sources exist."""
        # Setup source first
        Source.objects.create(
            notebook=self.notebook,
            title="Đặc điểm Django",
            source_type="text",
            content="Django có triết lý batteries-included giúp phát triển nhanh."
        )
        
        url = reverse('notebook-generate-material', kwargs={'pk': self.notebook.pk})
        data = {'generation_type': 'quiz'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['generation_type'], 'quiz')
        self.assertIsNotNone(response.data['content'])
        self.assertEqual(AIGeneration.objects.count(), 1)
