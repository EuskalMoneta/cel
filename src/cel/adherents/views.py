from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render


@login_required
def index(request):
    return render(request, 'adherents/index.html')


def first_time(request):
    return render(request, 'adherents/first-time.html')


def valid_first_time(request):
    return render(request, 'adherents/valid-token.html')


def lost_password(request):
    return render(request, 'adherents/lost-password.html')


def valid_lost_password(request):
    return render(request, 'adherents/valid-token.html')


def profile_home(request):
    return redirect('profile')


def profile(request):
    return render(request, 'adherents/index.html')


def compte_home(request):
    return redirect('history')


def history(request):
    return render(request, 'adherents/history.html')
