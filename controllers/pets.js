const express = require('express'),
      router = express.Router();

router.get('/pets', (req, res, next) => {
    let referer = req.get('Referer');
    if (referer) {
        if (referer.indexOf('www.messenger.com') >= 0) {
            res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.messenger.com/');
        } else if (referer.indexOf('www.facebook.com') >= 0) {
            res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.facebook.com/');
        }
        res.sendFile('public/options.html', {root: __dirname});
    }
});

router.get('/petspostback', (req, res) => {
    let body = req.query;
    let response = {
        "text": `Great, I will book you a ${body.bed} bed, with ${body.pillows} pillows and a ${body.view} view.`
    };

    res.status(200).send('Please close this window to return to the conversation thread.');
    callSendAPI(body.psid, response);
});

module.exports = router;
