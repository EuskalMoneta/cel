import functools

from django.forms.models import model_to_dict
from django.shortcuts import redirect
from django.utils.decorators import available_attrs

CGU = 'has_accepted_cgu'
EUSKO_NUM = 'has_account_eusko_numerique'
VALID_MEMBERSHIP = 'has_valid_membership'


def user_must_have_rights(needed_rights):

    """Check if user has the good rights to access this page.
       Warning: If you use this decorator, its implicit that an user is already authenticated.
    """

    def decorator(a_view):

        @functools.wraps(a_view, assigned=available_attrs(a_view))
        def _wrapped_view(request, *args, **kwargs):

            # Verify user rights access_granted must contains every needed_rights to access decorated view
            profile = model_to_dict(request.user.profile)
            access_granted = [right
                              for right in needed_rights
                              if profile.get(right, False)]

            # viewname = resolve(request.path).url_name
            if access_granted == needed_rights:
                return a_view(request, *args, **kwargs)

            elif CGU in needed_rights and CGU not in access_granted:
                return redirect('accept-cgu')

            elif VALID_MEMBERSHIP in needed_rights and VALID_MEMBERSHIP not in access_granted:
                return redirect('manage-membership', menu='nomenu')

            elif EUSKO_NUM in needed_rights and EUSKO_NUM not in access_granted:
                return redirect('profile')

            else:
                return redirect('logout')

        return _wrapped_view

    return decorator
