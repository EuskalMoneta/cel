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
    url(r'^logout/(?P<next_page>[\w\-]+)/?$', logout, name='logout-next'),

    # first-time
    url(r'^premiere-connexion/?$', adherents_views.first_time, name='first-time'),
    url(r'^valide-premiere-connexion/?$', adherents_views.valid_first_time, name='valide-premiere-connexion'),
    # lost-password
    url(r'^passe-perdu/?$', adherents_views.lost_password, name='lost-password'),
    url(r'^valide-passe-perdu/?$', adherents_views.valid_lost_password, name='valide-premiere-connexion'),

    # Special page: Accept CGU, Renew membership & Update user session
    url(r'^accepte-cgu/?$', adherents_views.accept_cgu, name='accept-cgu'),
    url(r'^cotisation/?$', adherents_views.renew_membership, name='renew-membership'),
    url(r'^update-session/?$', adherents_views.update_session, name='update-session'),

    # Mon profil
    url(r'^profil/?$', adherents_views.profile_home, name='profile-home'),
    url(r'^profil/cotisation/?$', adherents_views.renew_membership, name='manage-membership'),
    url(r'^profil/coordonnees/?$', adherents_views.profile, name='profile'),
    url(r'^profil/change-passe/?$', base_views.change_password, name='change-password'),

    # Mon compte
    url(r'^compte/?$', adherents_views.compte_home, name='compte-home'),
    url(r'^compte/synthese/?$', adherents_views.overview, name='overview'),
    url(r'^compte/synthese/reconvertir/?$', adherents_views.overview_reconvertir, name='overview-reconvertir'),
    url(r'^compte/historique/?$', adherents_views.history, name='history'),
    url(r'^compte/recharger/?$', adherents_views.compte_recharger, name='compte-recharger'),

    # euskokart
    url(r'^euskokart/?$', adherents_views.euskokart, name='euskokart-home'),

    # Virements
    url(r'^virements/?$', adherents_views.virements_home, name='virements-home'),
    url(r'^virements/beneficiaires/?$', adherents_views.virements_beneficiaires, name='virements-beneficiaires'),
    url(r'^virements/ponctuel/?$', adherents_views.virements_ponctuel, name='virements-ponctuel'),
    # home
    url(r'^$', adherents_views.index, name='home'),
]
