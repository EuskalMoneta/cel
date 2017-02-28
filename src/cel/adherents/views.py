import json

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import redirect, render
import requests

from base.decorators import user_must_have_rights, CGU, EUSKO_NUM, VALID_MEMBERSHIP


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def index(request):
    return redirect('overview')


def first_time(request):
    return render(request, 'adherents/first-time.html')


def valid_first_time(request):
    return render(request, 'adherents/valid-token.html')


def lost_password(request):
    return render(request, 'adherents/lost-password.html')


def valid_lost_password(request):
    return render(request, 'adherents/valid-token.html')


@login_required
@user_must_have_rights([CGU, VALID_MEMBERSHIP])
def profile_home(request):
    return redirect('profile')


@login_required
@user_must_have_rights([CGU, VALID_MEMBERSHIP])
def profile(request):
    return render(request, 'adherents/index.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def compte_home(request):
    return redirect('overview')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def overview(request):
    return render(request, 'adherents/overview.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def history(request):
    return render(request, 'adherents/history.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def virements_home(request):
    return redirect('virements-ponctuel')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def virements_beneficiaires(request):
    return render(request, 'adherents/virements-beneficiaires.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def virements_ponctuel(request):
    return render(request, 'adherents/virements-ponctuel.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def euskokart(request):
    return render(request, 'adherents/euskokart.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def overview_reconvertir(request):
    return render(request, 'adherents/overview-reconvertir.html')


@login_required
@user_must_have_rights([CGU, EUSKO_NUM, VALID_MEMBERSHIP])
def compte_recharger(request):
    return render(request, 'adherents/compte-recharger.html')


@login_required
def accept_cgu(request):
    return render(request, 'adherents/accept-cgu.html')


@login_required
@user_must_have_rights([CGU])
def renew_membership(request):
    return render(request, 'adherents/renew-membership.html')


@login_required
def update_session(request):
    if request.method == 'PUT':
        try:
            payload = request.body.decode('utf-8')
            data = json.loads(payload)
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({'error': 'Unable to decode request!'}, status=400)

        token = data.get('token', '')

        if not token:
            return JsonResponse({'error': 'You must provide a token!'}, status=400)

        # Get session data from Euskal Moneta API
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Token {}'.format(token)
        }

        try:
            r_user_data = requests.get('{}{}'.format(settings.API_INTERNAL_URL, 'user-rights/'),
                                       headers=headers)

            user_data = r_user_data.json()

            if not r_user_data.status_code == requests.codes.ok:
                return JsonResponse({'error': 'Error while fetching session data from Euskal Moneta API'}, status=400)
        except requests.exceptions.RequestException:
            return JsonResponse({'error': 'Error while fetching session data from Euskal Moneta API'}, status=400)

        user = User.objects.get(username=str(request.user))

        user_profile = user.profile

        user_profile.has_accepted_cgu = user_data['has_accepted_cgu']
        user_profile.has_account_eusko_numerique = user_data['has_account_eusko_numerique']
        user_profile.has_valid_membership = user_data['has_valid_membership']

        user.save()

        return JsonResponse({'status': 'OK'})
    else:
        return JsonResponse({'error': 'You must call this endpoint with the PUT method!'}, status=400)
