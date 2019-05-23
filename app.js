'use strict';

// Imports dependencies and set up http server
const express = require('express'),
      body_parser = require('body-parser');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(body_parser.json());
app.use(express.static('public'));

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

// CONTROLLERS
var petsController = require('./controllers/pets');
var webhookController = require('./controllers/webhook');

// ROUTES
app.use('/pets', petsController);
app.use('/webhook', webhookController);
