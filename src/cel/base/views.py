import json
import logging

from django.contrib.auth.decorators import login_required
from django.forms.models import model_to_dict
from django.shortcuts import render
from django.utils.html import mark_safe

from base.decorators import user_must_have_rights, VALID_MEMBERSHIP

log = logging.getLogger()


def config_js(request):
    """
    JavaScript config for this Django/React app.

    I use 'true' and 'false' as string on purpose!
    It will be converted in real bool objects on JavaScript-side
    """
    if request.user.is_authenticated():
        response = {'user_auth': 'true',
                    'profile': mark_safe(json.dumps(model_to_dict(request.user.profile, exclude=['id', 'user'])))}
    else:
        response = {'user_auth': 'false', 'username': ''}

    return render(request, 'config.js', response)


@login_required
@user_must_have_rights([VALID_MEMBERSHIP])
def change_password(request):
    return render(request, 'change-password.html')
