const router = require('express').Router(),
      request = require('request'),
      srequest = require('sync-request'),
      fs = require('fs'),
      gcloud = require('@google-cloud/vision'),
      config = require('../lib/config'),
      dotenv = require('dotenv').config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const APP_SECRET = process.env.APP_SECRET;

// WEBHOOK ROUTES GET
router.get('/', function(req, res) {
  const VERIFY_TOKEN = process.env.TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {

      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {

          // Respond with 200 OK and challenge token from the request
          console.log('WEBHOOK_VERIFIED');
          res.status(200).send(challenge);

      } else {
          // Responds with '403 Forbidden' if verify tokens do not match
          res.sendStatus(403);
      }
  }
});


// WEBHOOK ROUTES POST
router.post('/', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {

        body.entry.forEach(entry => {

            if (entry && entry.messaging){
              let webhook_event = entry.messaging[0];
              let sender_psid = webhook_event.sender.id;


              if (webhook_event.message) {
                if (webhook_event.message.text) {
                  handleText(sender_psid, webhook_event.message);
                } else if (webhook_event.message.attachments) {
                  handleAttachment(sender_psid, webhook_event.message)
                }
              } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
              }
            }

        });

        res.status(200).send('EVENT_RECEIVED');

    } else {
        res.sendStatus(404);
    }

});

function handleText(sender_psid, received_message) {
  let responses;

  if (received_message.text) {
    const message = received_message.text.toLowerCase();

    switch (message) {
        case "pets":
            responses = setFavoritePet(sender_psid);
            break;
        case "get started":
            responses = [
              {"text": `Hey there!`},
              {"text": `Let's play a fun game.`},
              {"text": `Send me a photo of your pet.`}
            ]
            break;
        default:
            responses = [{"text": `Sorry we don't understand!`}];
            break;
    }
  }

  // Send the response message
  if (responses) {
    responses.forEach(function(response){
      sendResponse(sender_psid, response);
    });
  }
}

function handleAttachment(sender_psid, received_message) {
    let responses;

    if (received_message.attachments) {
      const attachment = received_message.attachments[0];
      if (attachment.type == "image") {
        const url = attachment.payload.url;
        let label;

        downloadImage(url, sender_psid, function(path){
          if (fs.existsSync(path)) {
            googleVision(path, function(result){
                label = result[0];
            });
          }
        });

        if (label){
          response = [{"text": `That's cool `+ result[0].description.toLowerCase() +`, what's his name?`}];
        }
      } else {
        response = [{"text": `Not sure why you sent us an image.. But thanks!`}];
      }

    } else {
      response = [{"text": `Not sure what you mean by that, you can always type GET STARTED`}];
    }

    // Send the response message
    if (responses) {
      responses.forEach(function(response){
        sendResponse(sender_psid, response);
      });
    }
}

function setFavoritePet(sender_psid) {
    let responses = [{
        attachment: {
            type: "template",
            payload: {
                template_type: "button",
                text: "Check em out!",
                buttons: [
                  {
                    type: "web_url",
                    url: SERVER_URL + "/options",
                    title: "My Favorite Pets",
                    webview_height_ratio: "full",
                    messenger_extensions: true
                  }
                ]
            }
        }
    }];

    return responses;
}

// Sends response messages via the Send API
function sendResponse(sender_psid, response) {
    // Construct the message body
    try {
      let request_body = {
          "recipient": {
              "id": sender_psid
          },
          "message": response
      };

      srequest('POST', 'https://graph.facebook.com/v2.6/me/messages', {
        "qs": {"access_token": PAGE_ACCESS_TOKEN},
        "json": request_body
      });

    } catch(err) {
      console.log(err)
    }
}

function downloadImage(uri, sender_psid, callback){
  const path = './public/uploads/pets/'+ sender_psid +'.png';

  request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(path));
  });

  callback();
}

function googleVision(path, callback) {
  const vision = new gcloud.ImageAnnotatorClient(config.googleCloudCredentials),
        types = ['labels'];

  vision.webDetection(path, types, function(err, detections, apiResponse) {
    if (err){
      console.log(err);
    } else {
      callback(detections.webDetection.webEntities);
    }
  });
}

module.exports = router;
