import * as DICTIONARY from './dictionary.js'; // Ensure this path is correct

// Initial constants
const POST_COMMENT_BTN = document.getElementById('post');
const COMMENT_TEXT = document.getElementById('comment');
const COMMENTS_LIST = document.getElementById('commentsList');
const PROCESSING_CLASS = 'processing';
var currentUserName = 'Anonymous';

// Model configuration
const MODEL_JSON_URL = './model/model.json'; // Ensure this path is correct
const SPAM_THRESHOLD = 0.75;
var model = undefined; // Variable to store the loaded model

// The expected number of input elements for the ML Model
const ENCODING_LENGTH = 20;

/**
 * Function that takes an array of words, converts words to tokens,
 * and then returns a Tensor representation of the tokenization that
 * can be used as input to the machine learning model.
 */
function tokenize(wordArray) {
  // Always start with the START token.
  let returnArray = [DICTIONARY.START];

  // Loop through the words in the sentence you want to encode.
  // If word is found in dictionary, add that number; otherwise,
  // add the UNKNOWN token.
  for (var i = 0; i < wordArray.length; i++) {
    let encoding = DICTIONARY.LOOKUP[wordArray[i]];
    returnArray.push(encoding === undefined ? DICTIONARY.UNKNOWN : encoding);
  }

  // Finally, if the number of words was less than the minimum encoding length,
  // fill the rest with PAD tokens.
  while (returnArray.length < ENCODING_LENGTH) {
    returnArray.push(DICTIONARY.PAD);
  }

  // If the sentence is longer than ENCODING_LENGTH, truncate it.
  if (returnArray.length > ENCODING_LENGTH) {
    returnArray = returnArray.slice(0, ENCODING_LENGTH);
  }

  // Log the result to see what was created.
  console.log([returnArray]);

  // Convert to a TensorFlow Tensor and return it.
  return tf.tensor([returnArray]);
}

// Connect to Socket.io on the Node.js backend.
var socket = io.connect();

/**
 * Function to handle comments received from other clients via Socket.io.
 */
function handleRemoteComments(data) {
  // Render a new comment to DOM from a remote client.
  let li = document.createElement('li');
  let p = document.createElement('p');
  p.innerText = data.comment;

  let spanName = document.createElement('span');
  spanName.setAttribute('class', 'username');
  spanName.innerText = data.username;

  let spanDate = document.createElement('span');
  spanDate.setAttribute('class', 'timestamp');
  spanDate.innerText = data.timestamp;

  li.appendChild(spanName);
  li.appendChild(spanDate);
  li.appendChild(p);

  COMMENTS_LIST.prepend(li);
}

// Add event listener to receive remote comments that passed
// the spam check.
socket.on('remoteComment', handleRemoteComments);

/**
 * Asynchronous function to load the TFJS model and then use it to
 * predict if an input is spam or not spam. The 2nd parameter
 * allows us to specify the DOM element list item you are currently
 * classifying so you can change its style if it is spam.
 */
async function loadAndPredict(inputTensor, domComment) {
  // Load the model.json and binary files you hosted. Note this is
  // an asynchronous operation so you use the await keyword.
  if (model === undefined) {
    model = await tf.loadLayersModel(MODEL_JSON_URL);
  }

  // Once the model has loaded, you can call model.predict and pass it
  // an input in the form of a Tensor. You can then store the result.
  var results = await model.predict(inputTensor);

  // Print the result to the console for us to inspect.
  results.print();

  results.data().then((dataArray) => {
    if (dataArray[1] > SPAM_THRESHOLD) {
      domComment.classList.add('spam');
    } else {
      // Emit the socket.io comment event for the server to handle,
      // containing all the comment data you would need to render
      // the comment on a remote client's front end.
      socket.emit('comment', {
        username: currentUserName,
        timestamp: domComment.querySelectorAll('span')[1].innerText,
        comment: domComment.querySelectorAll('p')[0].innerText
      });
    }
  });
}

/**
 * Function to handle the processing of submitted comments.
 */
function handleCommentPost() {
  // Only continue if you are not already processing the comment.
  if (!POST_COMMENT_BTN.classList.contains(PROCESSING_CLASS)) {
    // Set styles to show processing in case it takes a long time.
    POST_COMMENT_BTN.classList.add(PROCESSING_CLASS);
    COMMENT_TEXT.classList.add(PROCESSING_CLASS);

    // Grab the comment text from DOM.
    let currentComment = COMMENT_TEXT.innerText;
    // Convert the sentence to lowercase, as the ML Model expects.
    // Strip all characters that are not alphanumeric or spaces.
    // Then split on spaces to create a word array, filtering out empty strings.
    let lowercaseSentenceArray = currentComment.toLowerCase().replace(/[^\w\s]/g, ' ').split(' ').filter(s => s.length > 0);

    // Create a list item DOM element in memory.
    let li = document.createElement('li');

    // Remember loadAndPredict is asynchronous so you use the then
    // keyword to await a result before continuing.
    loadAndPredict(tokenize(lowercaseSentenceArray), li).then(function() {
      // Reset class styles ready for the next comment.
      POST_COMMENT_BTN.classList.remove(PROCESSING_CLASS);
      COMMENT_TEXT.classList.remove(PROCESSING_CLASS);

      // If not spam, the comment was already emitted via Socket.io.
      // We only add the comment locally if it wasn't marked as spam.
      if (!li.classList.contains('spam')) {
          let p = document.createElement('p');
          p.innerText = currentComment; // Use the original comment to display

          let spanName = document.createElement('span');
          spanName.setAttribute('class', 'username');
          spanName.innerText = currentUserName;

          let spanDate = document.createElement('span');
          spanDate.setAttribute('class', 'timestamp');
          let curDate = new Date();
          spanDate.innerText = curDate.toLocaleString();

          // Remove existing children from `li` if any, to prevent duplicates
          while (li.firstChild) {
              li.removeChild(li.firstChild);
          }

          li.appendChild(spanName);
          li.appendChild(spanDate);
          li.appendChild(p);
          COMMENTS_LIST.prepend(li);
      } else {
        // Optional: If it's spam, you could display a different message to the local user.
        // E.g., "Your comment has been held for moderation."
        console.log("Comment marked as SPAM, not sent to server.");
      }

      // Reset comment text.
      COMMENT_TEXT.innerText = '';
    });
  }
}

// Add event listener to the post button
POST_COMMENT_BTN.addEventListener('click', handleCommentPost);

// Call loadAndPredict with a test tensor on page load (optional, for initial debugging)
// This was useful initially to verify that the model loaded.
// You can remove or comment it out if you prefer the first prediction to be with a real comment.
// loadAndPredict(tf.tensor([[1,3,12,18,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]));