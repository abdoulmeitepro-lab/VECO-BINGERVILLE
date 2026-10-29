# Recueillir les avis (5 minutes)

1. Crée un **Google Sheet** vide (sheets.google.com).
2. Menu **Extensions → Apps Script**. Supprime le code, colle le contenu de `apps-script.gs`, enregistre.
3. **Déployer → Nouveau déploiement → type « Application Web »**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   Autorise l'accès, puis **copie l'URL** (elle finit par `/exec`).
4. Dans `index.html`, cherche `FEEDBACK_CONFIG` et colle l'URL :
   `window.FEEDBACK_CONFIG=window.FEEDBACK_CONFIG||{endpoint:"https://script.google.com/macros/s/XXXX/exec"};`
5. Remets en ligne `index.html` + `feedback.js` (dans le même dossier).

Chaque avis arrive dans le Sheet : date, prénom, type, commentaire, section, texte de l'élément, écran, thème clair/sombre, appareil.

Pour retirer le bouton : supprime les 2 lignes `<script>` ajoutées avant `</body>`.
