from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
    username = models.CharField(max_length=15, default='')
    has_accepted_cgu = models.BooleanField(default=False)
    has_account_eusko_numerique = models.BooleanField(default=False)
    has_valid_membership = models.BooleanField(default=False)
    member_type = models.CharField(max_length=15, default='')
    lang = models.CharField(max_length=15, default='fr')
    display_name = models.CharField(max_length=50, default='')


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
