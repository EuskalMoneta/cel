# Compte En Ligne Eusko (CEL)



## Traductions

### Cas général
Pour tous les textes traduits dans les templates twig `{{ "texte" | trans }}` 

1. Générer les traductions manquantes :
`php bin/console translation:update --dump-messages --force eu`
`php bin/console translation:update --dump-messages --force fr`
2. Modifier le fichier /translations/messages.eu.xlf pour apporter les traductions manquantes.
 
### Dans les formulaires
Les traductions des formulaires ne sont pas générées automatiquement, on peut cependant en obtenir la liste via la barre
de debug en mode dev. Il suffit ensuite de faire un copier-coller d'un bloc xlf en changeant les paramètres.
 