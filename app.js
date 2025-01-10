const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Chemins des dossiers
const dataFolder = './data/';
const examsFolder = './exams/';

// Liste temporaire pour construire le questionnaire
let tempQuestionnaire = [];

// Initialisation de l'interface readline (une seule instance globale)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Fonction pour lister les fichiers GIFT dans un dossier
function listGiftFiles(folderPath) {
    return fs.readdirSync(folderPath).filter(file => file.endsWith('.gift'));
}

// Fonction pour charger les questions d'un fichier GIFT

function loadQuestions(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return extractQuestions(content);
}

// Fonction pour extraire les questions d'un fichier GIFT
function extractQuestions(content) {
    return content
        .split('\n\n') // Séparer par double saut de ligne
        .map(block => block.trim()) // Supprimer les espaces inutiles
        .filter(block => {
            // Garder les blocs qui commencent par `::` et incluent une question valide
            return block.startsWith('::') && block.includes(':');
        });
}

// Fonction pour analyser une question GIFT et extraire le texte et les réponses
function parseGiftQuestion(question) {
    const questionMatch = question.match(/::(.*?)::(.*)\{/);
    const title = questionMatch ? questionMatch[1].trim() : '';
    const questionText = questionMatch ? questionMatch[2].trim() : '';

    const choices = [...question.matchAll(/(~|=)(.*?)(?=[~=}])/g)]
        .map(([_, symbol, choice]) => ({
            choice: choice.trim(),
            isCorrect: symbol === '='
        }))
        .filter(choice => choice.choice !== '');

    // Déterminer le type de question
    let type = 'unknown';
    if (choices.length > 1) {
        type = 'multiple choice';
    } else if (/true|false/i.test(questionText)) {
        type = 'true/false';
    } else if (/{\s*}/.test(question)) {
        type = 'fill-in-the-blank';
    }

    if (!title || !questionText || choices.length === 0) {
        return null;
    }

    return {
        title,
        questionText,
        choices,
        type
    };
}

function extractQuestionsExamen(content) {
    const questionBlocks = content.match(/::.*?::[\s\S]*?\{[\s\S]*?\}/g);
    if (!questionBlocks) {
        console.warn('\x1b[31m%s\x1b[0m', "Aucun bloc de question valide trouvé !");
        return [];
    }
    return questionBlocks.map(block => block.trim());
}

function parseGiftQuestionExamen(block) {
    const questionMatch = block.match(/::(.*?)::(.*?)\{/s);
    if (!questionMatch) {
        console.warn('\x1b[31m%s\x1b[0m', "Échec de l'extraction de la question :", block);
        return null;
    }

    const title = questionMatch[1].trim();
    const questionText = questionMatch[2].trim();
    const choicesMatch = block.match(/\{([\s\S]*?)\}/s);
    const rawChoices = choicesMatch ? choicesMatch[1] : '';
    const choices = [...rawChoices.matchAll(/(~|=)([^~=]+)/g)].map(([_, symbol, text]) => ({
        choice: text.trim(),
        isCorrect: symbol === '='
    }));

    if (!choices.length) {
        console.warn('\x1b[31m%s\x1b[0m', "Aucun choix trouvé pour :", block);
        return null;
    }

    return {
        title,
        questionText,
        choices,
        type: 'multiple choice'
    };
}

function generateHistogram(examFilePath) {
    // Charger les questions de l'examen
    const examContent = fs.readFileSync(examFilePath, 'utf-8');
    const examQuestions = extractQuestionsExamen(examContent)
        .map(parseGiftQuestionExamen)
        .filter(q => q !== null);

    console.log('\x1b[32m%s\x1b[0m', "\nQuestions extraites de l'examen :");
    console.log(examQuestions);

    // Charger toutes les questions de la banque nationale
    const bankFiles = fs.readdirSync(dataFolder);
    let allQuestions = [];
    bankFiles.forEach(file => {
        const filePath = path.join(dataFolder, file);
        const rawQuestions = loadQuestions(filePath);
        const parsedQuestions = rawQuestions.map(parseGiftQuestion).filter(q => q !== null);
        allQuestions = allQuestions.concat(parsedQuestions);
    });
    console.log('\x1b[32m%s\x1b[0m', "\nQuestions extraites de la banque nationale :");
    console.log(allQuestions);

    // Calculer les répartitions
    const examDistribution = calculateTypeDistribution(examQuestions);
    const bankDistribution = calculateTypeDistribution(allQuestions);

    // Afficher les résultats comparatifs
    console.log('\nHistogramme comparatif :\n');
    displayHistogram('Examen', examDistribution);
    displayHistogram('Banque Nationale', bankDistribution);
}
async function vegaGraph(data){
    const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Types de questions et leur nombre",
        data: { values: data },
        mark: "bar",
        encoding: {
            x: { field: "type", type: "ordinal", title: "Type de question" },
            y: { field: "count", type: "quantitative", title: "Nombre de questions" },
            color: { field: "type", type: "nominal" },
        },
    };

    // Générer et sauvegarder les graphiques
    await renderChartToHtml(spec);
    await renderChartToPdf();
}
async function renderChartToHtml(spec) {
    const vegaView = new vega.View(vega.parse(vegalite.compile(spec).spec))
        .renderer('none')
        .initialize();
    const svg = await vegaView.toSVG(); // Génération SVG à partir du graphique

    // Sauvegarde du SVG dans un fichier HTML temporaire
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Chart</title></head>
        <body>${svg}</body>
        </html>
    `;
    const htmlPath = './chart.html';
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    console.log("Graphique HTML généré avec succès :", htmlPath);
}
// Génération et sauvegarde du graphique en PDF
async function renderChartToPdf() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/chart.html`, { waitUntil: 'load' });
    const pdfPath = `./data/chart-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`;
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
    });
    await browser.close();
    console.log("Graphique PDF généré avec succès :", pdfPath);
}
// Fonction pour calculer la répartition des types de questions
function calculateTypeDistribution(questions) {
    return questions.reduce((acc, question) => {
        acc[question.type] = (acc[question.type] || 0) + 1;
        return acc;
    }, {});
}

function displayHistogram(label, distribution) {
    console.log(`${label} :`);
    for (const [type, count] of Object.entries(distribution)) {
        console.log(`  ${type}: ${'*'.repeat(count)}`);
    }
}

// Menu principal

function mainMenu() {
    console.log('\x1b[34m%s\x1b[0m', '\nMenu principal :');
    console.log('\x1b[36m%s\x1b[0m', '1. Afficher toutes les questions');
    console.log('\x1b[36m%s\x1b[0m', '2. Rechercher des questions par mot-clé');
    console.log('\x1b[36m%s\x1b[0m', '3. Créer un fichier d’examen');
    console.log('\x1b[36m%s\x1b[0m', '4. Générer un fichier VCard');
    console.log('\x1b[36m%s\x1b[0m', '5. Simuler un examen');
    console.log('\x1b[36m%s\x1b[0m', '6. Comparer son histogramme à la banque de questions');
    console.log('\x1b[36m%s\x1b[0m', '7. Déplacer un fichier GIFT dans /data/');
    console.log('\x1b[36m%s\x1b[0m', '8. Visualiser un histogramme des types de questions');
    console.log('\x1b[36m%s\x1b[0m', '9. Quitter');
    

    rl.question('\x1b[36mChoisissez une option (1-8) : \x1b[0m', (choice) => {
        switch (choice.trim()) {
            case '1': // Afficher toutes les questions
                afficherToutesLesQuestions();
                break;

            case '2': // Rechercher des questions par mot-clé
                rechercherQuestionsParMotCle();
                break;

            case '3': // Créer un fichier d’examen
                creerExamen();
                break;

            case '4': // Générer un fichier VCard
                genererVCard();
                break;

            case '5': // Simuler un examen
                simulateExam();
                break;

            case '6': // Comparer histogrammes
                const files = listGiftFiles(examsFolder);
                if (files.length === 0) {
                    console.log('\x1b[31m%s\x1b[0m', 'Aucun fichier d’examen trouvé.');
                    mainMenu();
                } else {
                    console.log('\x1b[32m%s\x1b[0m', 'Fichiers d’examen disponibles :');
                    files.forEach((file, index) => console.log(`[${index + 1}] ${file}`));

                    rl.question('\x1b[34m \nEntrez le numéro du fichier d’examen à analyser : \x1b[0m', (choice) => {
                        const fileIndex = parseInt(choice, 10) - 1;
                        if (fileIndex >= 0 && fileIndex < files.length) {
                            const filePath = path.join(examsFolder, files[fileIndex]);
                            generateHistogram(filePath);
                        } else {
                            console.log('\x1b[31m%s\x1b[0m', 'Numéro invalide.');
                        }
                        mainMenu();
                    });
                }
                break;

            case '7': // Déplacer un fichier GIFT vers /data/
                rl.question('\x1b[32mEntrez le chemin du fichier GIFT à déplacer : \x1b[0m', (filePath) => {
                    moveGiftFileToData(filePath);
                    mainMenu();
                });
                break;

            case '8': // Histogramme
                analyserExamens();
                break;

            case '9': // Quitter
                console.log('Au revoir !');
                rl.close();
                break;

            default:
                console.log('\x1b[31m%s\x1b[0m', 'Option invalide. Veuillez réessayer.');
                mainMenu();
        }
    });
}

function analyserExamens() {
    const files = listGiftFiles(examsFolder);
    if (files.length === 0) {
        console.log('\x1b[31m%s\x1b[0m', 'Aucun fichier d’examen trouvé.');
        mainMenu();
    } else {
        console.log('\x1b[32m%s\x1b[0m', 'Fichiers d’examen disponibles :');
        files.forEach((file, index) => console.log(`[${index + 1}] ${file}`));

        rl.question('\x1b[32m\nEntrez le numéro du fichier d’examen à analyser : \x1b[0m', (choice) => {
            const fileIndex = parseInt(choice, 10) - 1;
            if (fileIndex >= 0 && fileIndex < files.length) {
                const filePath = path.join(examsFolder, files[fileIndex]);
                generateHistogramSeul(filePath);
            } else {
                console.log('\x1b[31m%s\x1b[0m', 'Numéro invalide.');
            }
            mainMenu();
        });
    }
}

function generateHistogramSeul(examFilePath) {
    // Charger les questions de l'examen
    const examContent = fs.readFileSync(examFilePath, 'utf-8');
    const examQuestions = extractQuestionsExamen(examContent)
        .map(parseGiftQuestionExamen)
        .filter(q => q !== null);

    // Calculer les répartitions
    const examDistribution = calculateTypeDistribution(examQuestions);
    displayHistogram('Examen', examDistribution);
}

function moveGiftFileToData(filePath) {
    const fileName = path.basename(filePath);
    const destinationPath = path.join(dataFolder, fileName);

    if (!fs.existsSync(filePath)) {
        console.log('\x1b[31m%s\x1b[0m', `Le fichier ${filePath} n'existe pas.`);
        return;
    }
    if (path.extname(filePath) !== '.gift') {
        console.log('\x1b[31m%s\x1b[0m', 'Ce fichier n\'est pas un fichier GIFT valide.');
        return;
    }
    if (fs.existsSync(destinationPath)) {
        console.log('\x1b[31m%s\x1b[0m', `Le fichier ${fileName} existe déjà dans le dossier /data/.`);
        return;
    }
    fs.renameSync(filePath, destinationPath);
    console.log('\x1b[32m%s\x1b[0m', `Le fichier a été déplacé vers /data/ : ${destinationPath}`);
}

function afficherToutesLesQuestions() {
    const files = listGiftFiles(dataFolder);
    let allQuestions = [];
    files.forEach(file => {
        const filePath = path.join(dataFolder, file);
        const rawQuestions = loadQuestions(filePath);
        const parsedQuestions = rawQuestions.map(parseGiftQuestion).filter(q => q !== null);
        allQuestions = allQuestions.concat(parsedQuestions);
    });

    if (allQuestions.length === 0) {
        console.log('\x1b[31m%s\x1b[0m', '\nAucune question valide trouvée.\n');
        mainMenu();
    } else {
        const addedQuestions = tempQuestionnaire.length;
        const color = addedQuestions < 15 ? '\x1b[31m' : '\x1b[32m';
        console.log(`\nQuestions disponibles (${color}${addedQuestions}\x1b[0m question(s) ajoutée(s) au test) :\n`);
        allQuestions.forEach((question, index) => {
            console.log(`[${index + 1}] ${question.title}`);
        });

        console.log('\x1b[36m%s\x1b[0m', '\nEntrez le numéro d’une question pour voir ses détails.');
        console.log('\x1b[36m%s\x1b[0m', 'Entrez 0 pour revenir au menu principal.');
        console.log('\x1b[36m%s\x1b[0m', 'Entrez "test" pour afficher les questions déjà ajoutées au test.');

        rl.question('\nVotre choix : ', (choice) => {
            const index = parseInt(choice, 10) - 1;

            if (choice === '0') {
                tempQuestionnaire = [];
                mainMenu(); // Retourner au menu principal
            } else if (choice === 'test') {
                afficherQuestionsTest(); // Afficher les questions du test
            } else if (index >= 0 && index < allQuestions.length) {
                afficherDetailsQuestion(allQuestions[index], allQuestions); // Afficher les détails de la question sélectionnée
            } else {
                console.log('\x1b[31m%s\x1b[0m', 'Choix invalide. Essayez à nouveau.');
                afficherToutesLesQuestions();
            }
        });
    }
}

function afficherQuestionsTest() {
    if (tempQuestionnaire.length === 0) {
        console.log('\x1b[31m%s\x1b[0m', '\nAucune question n’a encore été ajoutée au test.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', `\nQuestions ajoutées au test (${tempQuestionnaire.length} question(s)) :\n`);
        tempQuestionnaire.forEach((question, index) => {
            console.log(`[${index + 1}] ${question.title}`);
        });
    }

    console.log('\x1b[34m%s\x1b[0m', '\nOptions :');
    console.log('\x1b[36m%s\x1b[0m', '1. Revenir à la liste des questions.');
    console.log('\x1b[36m%s\x1b[0m', '2. Finaliser le test.');
    console.log('\x1b[36m%s\x1b[0m', '3. Revenir au menu principal.');

    rl.question('\nVotre choix : ', (option) => {
        if (option === '1') {
            afficherToutesLesQuestions();
        } else if (option === '2') {
            creerExamen();
        } else if (option === '3') {
            mainMenu();
        } else {
            console.log('\x1b[31m%s\x1b[0m', 'Choix invalide. Essayez à nouveau.');
            afficherQuestionsTest();
        }
    });
}



// Fonction pour afficher les détails et les réponses d'une question et permettre d'ajouter la question au test.

function afficherDetailsQuestion(question, allQuestions) {
    console.log(`\nDétails de la question : ${question.title}`);
    console.log(`Description : ${question.questionText}`);
    console.log('\nRéponses proposées :');
    question.choices.forEach((choice, index) => {
        console.log(`[${index + 1}] ${choice.choice} ${choice.isCorrect ? '(Correct)' : ''}`);
    });

    console.log('\x1b[34m\nOptions :\x1b[0m'); 
    console.log('\x1b[36m1. Ajouter cette question au test.\x1b[0m');
    console.log('\x1b[36m2. Revenir à la liste des questions.\x1b[0m');
    console.log('\x1b[36m3. Revenir au menu principal.\x1b[0m');
    

    rl.question('\nVotre choix : ', (option) => {
        if (option === '1') {
            // Vérifier si la question est déjà dans le test
            const alreadyAdded = tempQuestionnaire.some(q => q.title === question.title);
            if (alreadyAdded) {
                console.log('\x1b[31m%s\x1b[0m', `\nLa question "${question.title}" est déjà dans le test.`);
            } else {
                tempQuestionnaire.push(question); // Ajouter la question au test
                console.log('\x1b[32m%s\x1b[0m', `\nLa question "${question.title}" a été ajoutée au test (${tempQuestionnaire.length} question(s) au total).`);
            }
            afficherToutesLesQuestions(); // Retourner à la liste des questions
        } else if (option === '2') {
            afficherToutesLesQuestions(); // Retourner à la liste des questions
        } else if (option === '3') {
            mainMenu(); // Retourner au menu principal
        } else {
            console.log('\x1b[32m%s\x1b[0m', 'Choix invalide. Essayez à nouveau.');
            afficherDetailsQuestion(question, allQuestions); // Recharger les détails de la question
        }
    });
}




// Rechercher des questions par mot-clé

function rechercherQuestionsParMotCle() {
    rl.question('\x1b[36m\nEntrez un mot-clé pour rechercher des questions : \x1b[0m', (keyword) => {
        const files = listGiftFiles(dataFolder);
        let allQuestions = [];
        files.forEach(file => {
            const filePath = path.join(dataFolder, file);
            const rawQuestions = loadQuestions(filePath);
            const parsedQuestions = rawQuestions.map(parseGiftQuestion).filter(q => q !== null);
            allQuestions = allQuestions.concat(parsedQuestions);
        });

        const results = allQuestions.filter(q => q.questionText.toLowerCase().includes(keyword.toLowerCase()));
        if (results.length > 0) {
            console.log('\x1b[32m%s\x1b[0m', `\nQuestions trouvées pour "${keyword}" :\n`);
            results.forEach((q, index) => {
                console.log(`[${index + 1}] ${q.title} - ${q.questionText}`);
            });
        } else {
            console.log('\x1b[31m%s\x1b[0m', 'Aucune question trouvée.');
        }
        mainMenu();
    });
}

// Créer un fichier d'examen

function creerExamen() {
    if (tempQuestionnaire.length < 5) { // A remettre à 15 plus tard
        console.log('\x1b[31m%s\x1b[0m', '\nLe test doit contenir au moins 15 questions.');
        afficherQuestionsTest();
    } else if (tempQuestionnaire.length > 20) {
        console.log('\x1b[31m%s\x1b[0m', '\nLe test ne peut pas contenir plus de 20 questions.');
        afficherQuestionsTest();
    } else {
        rl.question('\x1b[32m%s\x1b[0m', '\nEntrez un nom pour le fichier d’examen (sans extension) : ', (fileName) => {
            saveExamToFile(tempQuestionnaire, `${fileName}.gift`); // Appel à la fonction
            tempQuestionnaire = []; // Réinitialiser le questionnaire temporaire
            console.log('\x1b[32m%s\x1b[0m', `\nFichier d'examen "${fileName}.gift" créé avec succès.`);
            mainMenu();
        });
    }
}


function saveExamToFile(questions, fileName) {
    const outputPath = path.join(examsFolder, fileName);
    const content = questions
        .map(q => `::${q.title}::${q.questionText}{\n${q.choices.map(c => `${c.isCorrect ? '=' : '~'}${c.choice}`).join('\n')}\n}`)
        .join('\n\n');
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log('\x1b[32m%s\x1b[0m', `\nFichier d'examen sauvegardé avec succès : ${outputPath}`);
}

// Fonction pour générer une VCard
function generateVCard(surname, name, email, phone) {
    return [
        'BEGIN:VCARD',
        'VERSION:4.0',
        `FN:${name} ${surname}`,
        `EMAIL:${email}`,
        `TEL:${phone}`,
        'END:VCARD'
    ].join('\n');
}
// Fonction pour sauvegarder une VCard

function saveVCard(vcard, fileName) {
    const vcardFolder = './vcard/';
    if (!fs.existsSync(vcardFolder)) {
        fs.mkdirSync(vcardFolder); // Créer le dossier s'il n'existe pas
    }
    const filePath = path.join(vcardFolder, `${fileName}.vcf`);
    fs.writeFileSync(filePath, vcard, 'utf-8');
    console.log('\x1b[32m%s\x1b[0m', `\nFichier VCard créé avec succès : ${filePath}`);
}

// Générer un fichier VCard

function genererVCard() {
    rl.question('Entrez votre prénom : ', (name) => {
        rl.question('Entrez votre nom : ', (surname) => {
            rl.question('Entrez votre email : ', (email) => {
                rl.question('Entrez votre numéro de téléphone : ', (phone) => {
                    const vcard = generateVCard(surname, name, email, phone);
                    rl.question('Entrez un nom pour le fichier VCard : ', (fileName) => {
                        saveVCard(vcard, fileName);
                        mainMenu();
                    });
                });
            });
        });
    });
}
// Simuler un examen

function simulateExam() {
    const files = listGiftFiles(examsFolder);
    if (files.length === 0) {
        console.log('\x1b[31m%s\x1b[0m', 'Aucun fichier d’examen trouvé.');
        mainMenu();
    } else {
        console.log('\x1b[32m%s\x1b[0m', 'Fichiers d’examen disponibles :');
        files.forEach((file, index) => console.log(`[${index + 1}] ${file}`));

        rl.question('\x1b[36m\nEntrez le numéro du fichier d’examen à simuler : \x1b[0m', (choice) => {
            const fileIndex = parseInt(choice, 10) - 1;
            if (fileIndex >= 0 && fileIndex < files.length) {
                const filePath = path.join(examsFolder, files[fileIndex]);
                startExam(filePath);  // Appel de la fonction qui va gérer l'examen
            } else {
                console.log('\x1b[31m%s\x1b[0m', 'Numéro invalide.');
                mainMenu();
            }
        });
    }
}

// Nouvelle fonction pour gérer le démarrage de l'examen
function startExam(filePath) {
    console.log(`Vous avez choisi le fichier : ${filePath}`);
    console.log('\x1b[31m%s\x1b[0m', `en attente de l'implémenation du code de passage de l'examen`);
    mainMenu();
    // Code à implémenter pour tester les examens.
}

// Initialiser les dossiers si nécessaires
if (!fs.existsSync(examsFolder)) fs.mkdirSync(examsFolder);

// Lancer le menu principal
mainMenu();
