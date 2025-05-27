

let model; 
const SPAM_THRESHOLD = 0.815; 
const MODEL_URL = './models/model.json'; 


const commentInput = document.getElementById('commentInput');
const checkButton = document.getElementById('checkButton');
const modelStatus = document.getElementById('modelStatus');
const displayComment = document.getElementById('displayComment');
const spamProbability = document.getElementById('spamProbability');
const classification = document.getElementById('classification');


async function loadModel() {
    try {
        modelStatus.textContent = 'Cargando modelo...';
        modelStatus.className = 'loading'; 
        model = await tf.loadLayersModel(MODEL_URL);
        modelStatus.textContent = 'Modelo cargado y listo!';
        modelStatus.className = 'not-spam'; 
        console.log('Modelo cargado exitosamente.');
    } catch (error) {
        modelStatus.textContent = 'Error al cargar el modelo.';
        modelStatus.className = 'spam'; 
        console.error('Error al cargar el modelo:', error);
    }
}


function preprocessText(text) {
   
    text = text.toLowerCase();
    
    text = text.replace(/[^a-z0-9\s]/g, '');

   
    const words = text.split(/\s+/).filter(word => word.length > 0);

   
    const sequence = words.map(word => {
        const index = dictionary.indexOf(word);
    
        return index > -1 ? index + 1 : 0;
    });

    
    const seq_len = 20; // 
    let paddedSequence = new Array(seq_len).fill(0); 
    if (sequence.length > seq_len) {
        paddedSequence = sequence.slice(0, seq_len); 
    } else {

        paddedSequence.splice(0, sequence.length, ...sequence);
    }

   
    return tf.tensor2d([paddedSequence], [1, seq_len]);
}


async function predictSpam() {
    if (!model) {
        alert('El modelo aún no se ha cargado. Por favor, espera un momento.');
        return;
    }

    const comment = commentInput.value.trim();
    if (comment === '') {
        alert('Por favor, ingresa un comentario para verificar.');
        return;
    }

    
    displayComment.textContent = comment;
    spamProbability.textContent = 'Calculando...';
    classification.textContent = 'Analizando...';
    classification.className = 'loading';


    const processedInput = preprocessText(comment);

   
    const prediction = model.predict(processedInput);
    
    const spamProb = (await prediction.data())[1]; 


    spamProbability.textContent = `${(spamProb * 100).toFixed(2)}%`;

    
    if (spamProb >= SPAM_THRESHOLD) {
        classification.textContent = '¡SPAM DETECTADO!';
        classification.className = 'spam'; 
    } else {
        classification.textContent = 'Comentario Legítimo';
        classification.className = 'not-spam'; 
    }

    
    processedInput.dispose();
    prediction.dispose();
}




checkButton.addEventListener('click', predictSpam);


loadModel();