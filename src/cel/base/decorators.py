import functools

from django.shortcuts import redirect
from django.utils.decorators import available_attrs


def user_must_have_rights(needed_rights):

    """Check if user has the good rights to access this page.
       Warning: If you use this decorator, its implicit that an user is already authenticated.
    """

    def decorator(a_view):

        @functools.wraps(a_view, assigned=available_attrs(a_view))
        def _wrapped_view(request, *args, **kwargs):

            # Verify user rights access_granted must contains every needed_rights to access the view
            access_granted = [right
                              for right in needed_rights
                              if request.user.profile.rights[right]]

            if access_granted == needed_rights:
                return a_view(request, *args, **kwargs)
            else:
                return redirect('logout')

        return _wrapped_view

    return decorator
