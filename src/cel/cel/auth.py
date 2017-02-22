import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render
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
            r_username = requests.get('{}{}'.format(settings.API_INTERNAL_URL, 'username/'),
                                      headers=headers)

            username = r_username.json()

            if not r_username.status_code == requests.codes.ok:
                log.critical('status_code: {} - content: {}'.format(r_username.status_code, r_username.content))
                log.critical('Identifiant ou Mot de passe invalide.')
                raise PermissionDenied()
        except requests.exceptions.RequestException as e:
            log.critical('CELAuthBackend - RequestException: {}'.format(e))
            log.critical('Identifiant ou Mot de passe invalide. Réessayez.')
            raise PermissionDenied()

        try:
            r_account = requests.get('{}{}'.format(settings.API_INTERNAL_URL, 'has-account/'),
                                     headers=headers)

            account = r_account.json()

            if not r_account.status_code == requests.codes.ok:
                log.critical('status_code: {} - content: {}'.format(r_account.status_code, r_account.content))
                log.critical('Identifiant ou Mot de passe invalide.')
                raise PermissionDenied()
        except requests.exceptions.RequestException as e:
            log.critical('CELAuthBackend - RequestException: {}'.format(e))
            log.critical('Identifiant ou Mot de passe invalide. Réessayez.')
            raise PermissionDenied()

        user, created = User.objects.get_or_create(username=username)

        try:
            user_profile = user.profile
        except ObjectDoesNotExist:
            user_profile = models.Profile(user=user)

        user_profile.has_account_eusko_numerique = account['status']

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
            HttpResponseBadRequest({'error': 'Unable to decode request!'})

        token = data.get('token', '')

        if not token:
            HttpResponseBadRequest({'error': 'You must provide a token!'})

        try:
            user = authenticate(token=token)
        except PermissionDenied:
            return JsonResponse(status=401)

        if user is not None:
            login(request, user)
            return JsonResponse({'connected': True})
        else:
            return JsonResponse({'connected': False}, status=401)

    return render(request, 'login.html')
