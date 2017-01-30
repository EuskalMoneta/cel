"""cel URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.10/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""

from django.conf.urls import url
from django.contrib.auth.views import logout
from django.core.urlresolvers import reverse_lazy

from adherents import views as adherents_views
from base import views as base_views
from cel.auth import login_view

urlpatterns = [
    # built-in Django i18n:
    # from django.conf.urls import include, i18n
    # url(r'^i18n/', include(i18n)),
    url(r'^i18n/setlang_custom/$', base_views.setlang_custom, name='setlang_custom'),

    # JavaScript config for this Django/React app
    url(r'^config\.js$', base_views.config_js, name='config_js'),
    # login
    url(r'^login/?$', login_view, name='login'),
    # logout
    url(r'^logout/?$', logout, {'next_page': reverse_lazy('login')}, name='logout'),
    # change-password
    url(r'^change-passe/?$', base_views.change_password, name='change-password'),
    # first-time
    url(r'^premiere-connexion/?$', adherents_views.first_time, name='first-time'),
    # lost-password
    url(r'^passe-perdu/?$', adherents_views.lost_password, name='lost-password'),
    # history
    url(r'^history/?$', adherents_views.history, name='history'),

    # home
    url(r'^$', adherents_views.index, name='home'),
]
