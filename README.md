# Gestionnaire de Questions GIFT et Examens

## Description
Ce programme en Node.js permet de gérer une banque de questions au format GIFT (Moodle) et de créer des fichiers d'examens personnalisés. Il offre des fonctionnalités comme la recherche de questions, la simulation d'examens, et la comparaison de types de questions entre un examen et une banque nationale.

---

## Fonctionnalités
1. Lister toutes les questions disponibles.
2. Rechercher des questions par mot-clé.
3. Ajouter des questions à un test et générer un fichier d'examen.
4. Générer un histogramme comparatif des types de questions.
5. Simuler un examen.
6. Générer des fichiers VCard pour les contacts.

---

## Installation
### Prérequis
- **Node.js** (version >= 14)
- **npm** (inclus avec Node.js)

### Étapes d'installation
1. Clonez ce dépôt :
   ```bash
   git clone <URL_DU_DEPOT>
   cd <NOM_DU_DEPOT>
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Assurez-vous que les dossiers nécessaires existent :
   - `data/` : Contient les fichiers de questions GIFT.
   - `exams/` : Contient les fichiers d'examen générés.

---

## Utilisation
Lancez le programme avec la commande suivante :
```bash
node app.js
```

Le programme affichera un menu interactif avec les options disponibles.

### Jeux de données fournis
- Placez vos fichiers GIFT dans le dossier `data/`.
- Les fichiers d'examen générés seront sauvegardés dans le dossier `exams/`.

### Exemple de fichier GIFT
```plaintext
::Question 1::Quelle est la couleur du ciel ? {
=Bleu
~Vert
~Rouge
}
```

---

## Fonctionnalités principales détaillées
### 1. **Lister toutes les questions**
   - Affiche toutes les questions disponibles dans la banque nationale.
   - Options pour afficher les détails ou ajouter une question à un test.

### 2. **Rechercher des questions par mot-clé**
   - Permet de trouver des questions contenant un mot ou une phrase spécifique.

### 3. **Créer un fichier d’examen**
   - Ajoutez entre 15 et 20 questions à un test.
   - Sauvegardez le test sous forme d’un fichier GIFT.

### 4. **Simuler un examen**
   - Affiche les questions d’un fichier d’examen choisi par l’utilisateur.

### 5. **Générer un histogramme comparatif**
   - Compare les types de questions entre un fichier d’examen et la banque nationale.

### 6. **Générer une VCard**
   - Crée un fichier `.vcf` avec les informations saisies.

---

## Tests
Pour tester les fonctionnalités :
1. Ajoutez des fichiers GIFT au dossier `data/`.
2. Lancez le programme et naviguez dans le menu pour tester chaque fonctionnalité.
3. Vérifiez les fichiers générés dans le dossier `exams/` ou `vcard/`.

---

## Dépendances
Les dépendances principales sont listées dans le fichier `package.json` :
- **fs** : Gestion des fichiers.
- **path** : Manipulation des chemins de fichiers.
- **readline** : Interaction utilisateur en ligne de commande.

Installez-les via :
```bash
npm install
```

---

## Écarts au cahier des charges
### Limites connues :
1. Le programme ne prend pas encore en charge les fichiers GIFT contenant des sections ou des métadonnées avancées.
2. La simulation d'examens ne gère pas encore les réponses interactives.

---

## Prochaines améliorations
- Ajouter une interface web pour une utilisation plus intuitive.
- Étendre le support des types de questions GIFT.
- Permettre la correction automatique des examens simulés.

---

## Auteurs
- Nourhane, Enoa, Romain