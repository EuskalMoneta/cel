# Changelog

## CEL (06-2020)

### Yousign
- Nouveau vendor à installer pour YouSign WiziSignClient
- Vérifier que wkhtmltopdf est bien installé, renseigner dans le .env.local le chemin du binaire
- Ajout de l'API Yousign pour la signature de mandats SEPA. Nécessite l'ajout de deux variable d'env à copier
  depuis .env vers .env.local (YOUSIGN_API_KEY et YOUSIGN_MODE)

## Vacances en Eusko (04-2020)

#### Enhancements:

- Ajout de l'API IDcheck pour la vérification de pièces d'identité. Nécessite l'ajout de deux variable d'env à copier
  depuis .env vers .env.local (IDCHECK_URL et IDCHECK_AUTH)

#### Bug Fixes:

- Changement de la méthode getenv() vers $ENV[] dans le constructeur de APIToolbox. A vérifier que ce changement 
  ne pose pas de soucis en prod


---
