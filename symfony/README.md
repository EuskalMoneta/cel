# Compte En Ligne Eusko (CEL)

## Installation docker-compose

* git clone ssh://.... ./cel
* `cd cel`

* `cd symfony` puis `cp .env .env.local`
* Modifier dans .env.local les paramètres de base de données avec ceux inscrit dans le docker-compose.yml
* Modifier dans .env.local APP_ENV=prod ou dev

* docker-compose up -d
* docker-compose exec php composer install

* docker-compose exec php php bin/console doctrine:database:create  //normalement renvoi une erreur database déjà existante --> ignorer
* docker-compose exec php php bin/console doctrine:migrations:migrate (puis valider y)


Vérifier les permissions des dossiers symfony/var/cache symfony/var/log  symfony/logs et symfony/public/uploads \


do not forget to add `symfony.localhost` in your `/etc/hosts` file.
You are done, you can visit your Symfony application on the following URL: `http://symfony.localhost:8000`

That's all folks ! 

## Installation stack LAMP

1. git clone https://.... ./cel
2. `cd cel`
3. Installer composer https://getcomposer.org/download/
4. lancer `php composer install`
5. `cp .env .env.local`
7. Renseigner les identifiants et le nom de la base dans le fichier .env.local
`DATABASE_URL=mysql://db_user:db_password@127.0.0.1:3306/db_name`
8. Une fois les vendors installés : `php bin/console doctrine:database:create`
9. lancer dans le navigateur la page cel/public/index.php  (c'est important de bien préciser le index.php en mode dev)

## Commandes utiles

Faire une mise à jour de la base de données \
`php bin/console doctrine:migrations:migrate`

Vérifier les permissions des dossiers var/cache var/log et public/uploads \


## Traductions

### Cas général
Pour tous les textes traduits dans les templates twig `{{ "texte" | trans }}` ou dans les controleurs par `$translator->trans('texte');`

1. Générer les traductions manquantes :
`php bin/console translation:update --dump-messages --force eu`
`php bin/console translation:update --dump-messages --force fr`
2. Modifier le fichier /translations/messages.eu.xlf pour apporter les traductions manquantes.

`<trans-unit id="VFSc1BP" resname="Bureaux de change">
    <source>Bureaux de change</source>
    <target>Traduction en euskara</target>
    </trans-unit>`
    
L'identifiant id= doit être unique, et resname == source. 
On peut ajouter des blocs à la main, mais c'est plus simple de le faire générer par Symfony !
 
### Dans les formulaires
Bien penser à effectuer la traduction dans le controleur avec `$translator->trans('texte');`
  
 https://marmelab.com/blog/2019/07/25/quixo-avec-symfo-framework-php.html
 
 ### upgrade minor version 
 `docker-compose exec php composer update "symfony/*" --with-all-dependencies` 
 
 
 ### Après une mise à jour de la base Dolibarr
 - penser à refaire le processus d'activation de compte
 - vider la base sqli contenant les questions secrètes (voir issue #35 )