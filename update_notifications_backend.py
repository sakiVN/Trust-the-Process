import os

# Update notebook/urls.py
urls_path = 'notebook/urls.py'
with open(urls_path, 'r', encoding='utf-8') as f:
    urls_content = f.read()

urls_content = urls_content.replace(
    "from .views import NotebookViewSet, NoteViewSet, SourceViewSet, AIGenerationViewSet, QuizSetViewSet, QuizAttemptViewSet",
    "from .views import NotebookViewSet, NoteViewSet, SourceViewSet, AIGenerationViewSet, QuizSetViewSet, QuizAttemptViewSet, get_dashboard_notifications"
)
urls_content = urls_content.replace(
    "urlpatterns = [\n    path('', include(router.urls)),\n]",
    "urlpatterns = [\n    path('dashboard/notifications/', get_dashboard_notifications, name='dashboard-notifications'),\n    path('', include(router.urls)),\n]"
)
with open(urls_path, 'w', encoding='utf-8') as f:
    f.write(urls_content)


# Update notebook/views.py
views_path = 'notebook/views.py'
with open(views_path, 'r', encoding='utf-8') as f:
    views_content = f.read()

views_injection = """
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
            'message': f'7 ngày qua, bạn đã tạo {ai_count} tài liệu AI và làm {quiz_count} bài Quiz.',
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
"""

if "def get_dashboard_notifications" not in views_content:
    with open(views_path, 'a', encoding='utf-8') as f:
        f.write(views_injection)

print("Updated views.py and urls.py successfully.")
