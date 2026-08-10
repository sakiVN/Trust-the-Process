from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile
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

    def test_add_source_pdf(self):
        """API: Add a source PDF document to a notebook and extract its text."""
        url = reverse('notebook-add-source', kwargs={'pk': self.notebook.pk})
        
        # Construct a simple PDF in memory
        pdf_data = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
            b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
            b"5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n70 700 Td\n(Python PDF Reader Test) Tj\nET\nendstream\nendobj\n"
            b"xref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000113 00000 n\n0000000244 00000 n\n0000000321 00000 n\n"
            b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n414\n%%EOF"
        )
        pdf_file = SimpleUploadedFile("test.pdf", pdf_data, content_type="application/pdf")
        
        data = {
            'title': 'Tài liệu PDF Test',
            'source_type': 'file',
            'file_path': pdf_file
        }
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Source.objects.count(), 1)
        
        # Verify text extraction occurred and content is populated
        new_source = Source.objects.first()
        self.assertEqual(new_source.title, 'Tài liệu PDF Test')
        self.assertIn('Python PDF Reader Test', new_source.content)

    def test_add_note(self):
        """API: Add a note (journal draft) to a notebook with empty initial_content."""
        url = reverse('notebook-add-note', kwargs={'pk': self.notebook.pk})
        data = {
            'title': 'Chủ đề triết học mới',
            'initial_content': ''
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Note.objects.count() should be 2 (one setup note + one newly added note)
        self.assertEqual(Note.objects.count(), 2)
        new_note = Note.objects.exclude(pk=self.note.pk).first()
        self.assertEqual(new_note.title, 'Chủ đề triết học mới')
        self.assertEqual(new_note.initial_content, '')
        self.assertTrue(new_note.is_locked)

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

    def test_note_revise_api_success(self):
        """API: Successfully revise an unlocked note."""
        # Setup unlocked note
        self.note.is_locked = False
        self.note.save()
        
        url = reverse('note-revise', kwargs={'pk': self.note.pk})
        data = {'revised_content': 'Đây là ý kiến đã được chỉnh sửa.'}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['revised_content'], 'Đây là ý kiến đã được chỉnh sửa.')
        
        # Verify in DB
        self.note.refresh_from_db()
        self.assertEqual(self.note.revised_content, 'Đây là ý kiến đã được chỉnh sửa.')

    def test_note_revise_api_locked(self):
        """API: Fail to revise a locked note."""
        url = reverse('note-revise', kwargs={'pk': self.note.pk})
        data = {'revised_content': 'Thử chỉnh sửa khi bị khóa.'}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['error'],
            'This note is locked. You must submit your initial content and unlock it first.'
        )

    def test_note_revise_api_missing_content(self):
        """API: Fail to revise with empty/missing revised_content."""
        self.note.is_locked = False
        self.note.save()
        
        url = reverse('note-revise', kwargs={'pk': self.note.pk})
        
        # Scenario 1: missing completely
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'revised_content is required.')

        # Scenario 2: empty string
        response = self.client.post(url, {'revised_content': '   '})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'revised_content is required.')

    def test_note_revise_api_not_found(self):
        """API: Fail to revise a non-existent note (returns 404)."""
        url = reverse('note-revise', kwargs={'pk': 99999})
        data = {'revised_content': 'Không tồn tại.'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_source_api(self):
        """API: Successfully delete a source document."""
        source = Source.objects.create(
            notebook=self.notebook,
            title='Tài liệu mẫu',
            source_type='text',
            content='Nội dung nháp'
        )
        self.assertEqual(Source.objects.count(), 1)
        
        url = reverse('source-detail', kwargs={'pk': source.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Source.objects.count(), 0)

    def test_delete_generation_api(self):
        """API: Successfully delete an AI generated material."""
        gen = AIGeneration.objects.create(
            notebook=self.notebook,
            generation_type='quiz',
            content='[]'
        )
        self.assertEqual(AIGeneration.objects.count(), 1)
        
        url = reverse('generation-detail', kwargs={'pk': gen.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AIGeneration.objects.count(), 0)

