const fs = require('fs');
const path = require('path');
/**
 * Fonction pour lister les fichiers GIFT dans un dossier
 */
function listGiftFiles(folderPath) {
    return fs.readdirSync(folderPath).filter(file => file.endsWith('.gift'));
}

/**
 * Fonction pour charger les questions d'un fichier GIFT
 */
function loadQuestions(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return extractQuestions(content);
}

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

function extractQuestions(content) {
    console.log("Séparation des questions...");
    
    // Séparer le contenu par les retours à la ligne simples
    const lines = content.split('\n');
    
    // Recomposer les questions en fonction de la ligne qui commence par "::"
    const questionsArray = [];
    let currentQuestion = '';
    
    lines.forEach(line => {
        if (line.startsWith('::')) {
            if (currentQuestion) {
                questionsArray.push(currentQuestion);
            }
            currentQuestion = line.trim();
        } else if (currentQuestion) {
            currentQuestion += '\n' + line.trim();  // Ajouter la ligne à la question courante
        }
    });
    
    // Ajouter la dernière question
    if (currentQuestion) {
        questionsArray.push(currentQuestion);
    }

    return questionsArray;
}

describe("Project Functions Unit Tests", function () {
    const dataFolder = './data/';
    const testGiftFilePath = path.join(dataFolder, 'test_questions.gift');

    beforeAll(() => {
        fs.writeFileSync(testGiftFilePath, `
::Q1::What is 2+2? {=4 ~3 ~5}
::Q2::Which is a fruit? {=Apple ~Carrot ~Potato}
::Q3::True or False: The Earth is flat? {=False ~True}
        `);
    });

    afterAll(() => {
        if (fs.existsSync(testGiftFilePath)) {
            fs.unlinkSync(testGiftFilePath);
        }
    });

    it("should list all GIFT files in the specified folder", function () {
        const files = listGiftFiles(dataFolder);
        expect(files).toContain('test_questions.gift');
    });

    it("should load questions from a GIFT file", function () {
        const questions = loadQuestions(testGiftFilePath);
        console.log(questions);
        expect(questions.length).toBe(3);
        expect(questions).toContain(jasmine.stringMatching(/::Q1::.*\{.*\}/));
    });

    it("should parse a GIFT question correctly", function () {
        const giftQuestion = "::Q1::What is 2+2? {=4 ~3 ~5}";
        const parsedQuestion = parseGiftQuestion(giftQuestion);

        expect(parsedQuestion).toEqual({
            title: "Q1",
            questionText: "What is 2+2?",
            choices: [
                { choice: "4", isCorrect: true },
                { choice: "3", isCorrect: false },
                { choice: "5", isCorrect: false }
            ],
            type: "multiple choice"
        });
    });
});