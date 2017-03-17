import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate, login
from django.contrib.auth.views import logout
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.translation import activate, LANGUAGE_SESSION_KEY
import requests

from base import models

log = logging.getLogger()


class CELAuthBackend(object):
    """ Authenticate users against Dolibarr through the EuskalMoneta API """

    def authenticate(self, token):
        user = None

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
                log.critical('status_code: {} - content: {}'.format(r_user_data.status_code, r_user_data.content))
                log.critical('Identifiant ou Mot de passe invalide.')
                raise PermissionDenied()
        except requests.exceptions.RequestException as e:
            log.critical('CELAuthBackend - RequestException: {}'.format(e))
            log.critical('Identifiant ou Mot de passe invalide. Réessayez.')
            raise PermissionDenied()

        user, created = User.objects.get_or_create(username=user_data['username'])

        try:
            user_profile = user.profile
        except ObjectDoesNotExist:
            user_profile = models.Profile(user=user)

        user_profile.username = user_data['username']
        user_profile.has_accepted_cgu = user_data['has_accepted_cgu']
        user_profile.has_account_eusko_numerique = user_data['has_account_eusko_numerique']
        user_profile.has_valid_membership = user_data['has_valid_membership']
        user_profile.member_type = user_data['member_type']
        user_profile.lang = user_data['lang']
        user_profile.display_name = user_data['display_name']

        user.save()
        return user

    # Required for your backend to work properly - unchanged in most scenarios
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


def login_view(request, **kwargs):
    if request.method == 'POST':
        try:
            payload = request.body.decode('utf-8')
            data = json.loads(payload)
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({'error': 'Unable to decode request!'}, status=400)

        token = data.get('token', '')

        if not token:
            return JsonResponse({'error': 'You must provide a token!'}, status=400)

        try:
            user = authenticate(token=token)
        except PermissionDenied:
            return JsonResponse(status=401)

        if user is not None:
            login(request, user)
            response = JsonResponse({'connected': True})

            # Force i18n for React
            request.session[LANGUAGE_SESSION_KEY] = user.profile.lang
            response.set_cookie(settings.LANGUAGE_COOKIE_NAME,
                                user.profile.lang,
                                max_age=settings.LANGUAGE_COOKIE_AGE,
                                path=settings.LANGUAGE_COOKIE_PATH,
                                domain=settings.LANGUAGE_COOKIE_DOMAIN)
            activate(user.profile.lang)
            return response
        else:
            return JsonResponse({'connected': False}, status=401)

    return render(request, 'login.html')


def logout_view(request, **kwargs):
    response = logout(request, **kwargs)
    # Force i18n for React
    response.delete_cookie(settings.LANGUAGE_COOKIE_NAME)
    request.session[LANGUAGE_SESSION_KEY] = 'fr'
    activate('fr')
    return response
