from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('notebook', '0003_quizset_quizquestion_quizattempt'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aigeneration',
            name='notebook',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='generations',
                to='notebook.notebook',
            ),
        ),
    ]
