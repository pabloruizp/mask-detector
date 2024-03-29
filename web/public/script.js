const video = document.getElementById('webcam');
const videoMargin = document.getElementById('videoMargin');
const enableWebcamButton = document.getElementById('webcamButton');
const predictionText = document.getElementById('prediction');
const predictionLine = document.getElementById('predictionLine');
const loadingButton = document.getElementById('loading')
const canvas = document.getElementById('output');

const IMAGE_SIZE = 224;
const LABELS = ['mask', 'no-mask'];
const INPUTMAX = 1;
const INPUTMIN = -1;
const NORMALIZATION = (INPUTMAX - INPUTMIN) / 255.0;

let actualPred = 0
let diffPred = 0

///////////////////////////// NORMALIZE DATA /////////////////////////////
// github.com/tensorflow/tfjs-models/blob/master/mobilenet/src/index.ts //

function cleanImg(img) {
  return tf.tidy(() => {
    if (!(img instanceof tf.Tensor)) {
      img = tf.browser.fromPixels(img);
    }

    // Normalize the image from [0, 255] to [inputMin, inputMax].
    const normalized = tf.add(
        tf.mul(tf.cast(img, 'float32'), NORMALIZATION),
        INPUTMIN);

    // Resize the image to
    let resized = normalized;
    if (img.shape[0] !== IMAGE_SIZE || img.shape[1] !== IMAGE_SIZE) {
      const alignCorners = true;
      resized = tf.image.resizeBilinear(
          normalized, [IMAGE_SIZE, IMAGE_SIZE], alignCorners);
    }

    // Reshape so we can pass it to predict.
    const batched = tf.reshape(resized, [-1, IMAGE_SIZE, IMAGE_SIZE, 3]);
    return batched;
  });
}
////////////////////////////////////////////////////////////////////////

function argMax(pred) {
    if(pred[0] > pred[1]) {
        return 0
    }
    return 1
}

// Check if webcam access is supported.
function getUserMediaSupported() {
return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will 
// define in the next step.
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

// Placeholder function for next step. Paste over this in the next step.
// Enable the live webcam view and start classification.
function enableCam(event) {

    //predictionLine.style.display = 'block'
    enableWebcamButton.style.display = 'none'

    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
        return;
    }    

    // getUsermedia parameters to force video but not audio.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
}

// Placeholder function for next step.
async function predictWebcam() {
    const img2Predict = cleanImg(video);
    const prediction = model.predict(img2Predict).dataSync();

    if (argMax(prediction) != actualPred) {
        diffPred++;
        if (diffPred > 1) {
            actualPred = argMax(prediction)
            diffPred = 0
        }
    } else if (diffPred > 0) {
        diffPred--;
    }

    const face = await modelFaces.estimateFaces(
      video, false, true, false);
  
    if (face.length > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const start = face[0].topLeft;
      const end = face[0].bottomRight;
      const size = [end[0] - start[0], end[1] - start[1]];
      if(actualPred == 0) {
          ctx.strokeStyle = "#6eeb5e";
      } else {
          ctx.strokeStyle = "#eb4034";
      }
      ctx.strokeRect(start[0], start[1], size[0], size[1]);
    }

    window.requestAnimationFrame(predictWebcam);
}

// Load the model.
var model =  undefined
var modelFaces = undefined
var ctx;

canvas.width = 640;
canvas.height = 480;
ctx = canvas.getContext('2d');
ctx.lineWidth = "2";

tf.loadLayersModel('./model/model.json').then(async (loadModel) => {
    modelFaces = await blazeface.load();
    model = loadModel;
    loadingButton.style.display = 'none'
    enableWebcamButton.style.display = 'inline'
});



