const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Interface pour l'entrée utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Fonction pour lire et parser les fichiers GIFT dans le dossier "data"
function lireTousLesFichiersGift() {
    const cheminData = path.join(__dirname, 'data');
    try {
        const fichiers = fs.readdirSync(cheminData).filter(file => file.endsWith('.gift'));
        let contenuComplet = '';
        fichiers.forEach(fichier => {
            const cheminFichier = path.join(cheminData, fichier);
            const contenu = fs.readFileSync(cheminFichier, 'utf8');
            contenuComplet += contenu + '\n';
        });
        return contenuComplet;
    } catch (err) {
        console.error('Erreur lors de la lecture des fichiers :', err.message);
        return '';
    }
}

// Fonction pour extraire et nettoyer les questions
function extraireQuestions(contenu) {
    return contenu.split('\n')
        .filter(ligne => ligne.startsWith('::')) // Filtre les questions
        .map(ligne => ligne.replace(/^::.*?::/, '').trim()); // Retire le titre entre "::"
}

// Fonction pour rechercher une question spécifique
function rechercherQuestion(motCle, questions) {
    return questions.filter(question => question.toLowerCase().includes(motCle.toLowerCase()));
}

// Fonction pour afficher les questions avec pagination
function afficherQuestionsAvecPagination(questions, pageSize = 10) {
    let currentPage = 0;

    function afficherPage(page) {
        const startIndex = page * pageSize;
        const endIndex = Math.min(startIndex + pageSize, questions.length);
        console.log(`\n=== Questions ${startIndex + 1} à ${endIndex} sur ${questions.length} ===`);
        for (let i = startIndex; i < endIndex; i++) {
            console.log(`${i + 1}. ${questions[i]}`);
        }

        if (endIndex < questions.length) {
            console.log("\nTapez 'n' pour la page suivante ou 'q' pour quitter.");
        } else {
            console.log("\nVous avez atteint la fin des questions. Tapez 'q' pour quitter.");
        }
    }

    afficherPage(currentPage);

    rl.on('line', (input) => {
        if (input.toLowerCase() === 'n' && (currentPage + 1) * pageSize < questions.length) {
            currentPage++;
            afficherPage(currentPage);
        } else if (input.toLowerCase() === 'q') {
            console.log("Retour au menu principal.");
            rl.removeAllListeners('line');
            menu();
        } else {
            console.log("Commande non reconnue. Tapez 'n' pour la page suivante ou 'q' pour quitter.");
        }
    });
}

// Menu principal pour l'utilisateur
function menu() {
    console.log("\n=== MENU PRINCIPAL ===");
    console.log("1. Rechercher une question par mot-clé");
    console.log("2. Afficher toutes les questions");
    console.log("3. Quitter");

    rl.question("\nVotre choix : ", (choix) => {
        const contenu = lireTousLesFichiersGift();
        const questions = extraireQuestions(contenu);

        switch (choix) {
            case '1':
                rl.question("Entrez le mot-clé à rechercher : ", (motCle) => {
                    const resultats = rechercherQuestion(motCle, questions);
                    if (resultats.length === 0) {
                        console.log("Aucune question trouvée contenant ce mot-clé.");
                    } else {
                        afficherQuestionsAvecPagination(resultats);
                    }
                });
                break;
            case '2':
                if (questions.length === 0) {
                    console.log("Aucune question disponible.");
                } else {
                    afficherQuestionsAvecPagination(questions);
                }
                break;
            case '3':
                console.log("Au revoir !");
                rl.close();
                break;
            default:
                console.log("Choix invalide.");
                menu();
        }
    });
}

// Lancer le menu
menu();
