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
        .map(ligne => ({
            identifiant: ligne.match(/^::(.*?)::/)?.[1] || 'Inconnu',
            contenu: ligne.replace(/^::.*?::/, '').trim() // Supprime l'identifiant et nettoie
        }));
}

// Fonction pour rechercher des questions par mot-clé
function rechercherQuestions(motCle, questions) {
    return questions.filter(question =>
        question.contenu.toLowerCase().includes(motCle.toLowerCase())
    );
}

// Fonction pour afficher les détails d'une question
function afficherDetailsQuestion(question) {
    console.log("\n=== Détails de la question ===");
    console.log(`Identifiant : ${question.identifiant}`);
    console.log(`Question : ${question.contenu}`);
}

// Fonction principale : Afficher toutes les questions sans pagination
function afficherToutesLesQuestions(questions) {
    if (questions.length === 0) {
        console.log("Aucune question disponible.");
        menu();
        return;
    }

    console.log("\n=== Liste des Questions ===");
    questions.forEach((question, index) => {
        console.log(`${index + 1}. ${question.contenu}`);
    });

    console.log("\nTapez le numéro de la question pour afficher ses détails.");
    console.log("Tapez 'r' pour revenir au menu principal.");
    console.log("Tapez 'q' pour quitter.");

    rl.on('line', (input) => {
        if (input.toLowerCase() === 'r') {
            console.log("Retour au menu principal...");
            rl.removeAllListeners('line');
            menu();
        } else if (input.toLowerCase() === 'q') {
            console.log("Au revoir !");
            rl.close();
        } else {
            const index = parseInt(input) - 1;
            if (index >= 0 && index < questions.length) {
                afficherDetailsQuestion(questions[index]);
            } else {
                console.log("Choix invalide. Essayez à nouveau.");
            }
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
                rl.question("Entrez le mot-clé pour la recherche : ", (motCle) => {
                    const resultats = rechercherQuestions(motCle, questions);
                    if (resultats.length === 0) {
                        console.log("\nAucun résultat trouvé.");
                        menu();
                    } else {
                        afficherToutesLesQuestions(resultats);
                    }
                });
                break;
            case '2':
                afficherToutesLesQuestions(questions);
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

// Simuler l'authentification et lancer le menu
function demarrerApplication() {
    console.log("Authentification réussie ! Bienvenue dans l'application.");
    menu();
}

// Démarrer l'application
demarrerApplication();
