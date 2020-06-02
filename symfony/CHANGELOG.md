# Changelog

## Vacances en Eusko (04-2019)

#### Enhancements:

- Ajout de l'API IDcheck pour la vérification de pièces d'identité. Nécessite l'ajout de deux variable d'env à copier
  depuis .env vers .env.local (IDCHECK_URL et IDCHECK_AUTH)

#### Bug Fixes:

- Changement de la méthode getenv() vers $ENV[] dans le constructeur de APIToolbox. A vérifier que ce changement 
  ne pose pas de soucis en prod


---
