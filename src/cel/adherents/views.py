from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def index(request):
    return render(request, 'adherents/index.html')


def first_time(request):
    return render(request, 'adherents/first-time.html')


def lost_password(request):
    return render(request, 'adherents/lost-password.html')
