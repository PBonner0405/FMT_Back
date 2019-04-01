const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cors());
const User = require('../model/user');

app.post('/login', passport.authenticate('local'), function(req, res, data) {
    var user = req.user;
    jwt.sign({user}, 'wSh947xzgG7J', { expiresIn: '14d' }, (err, token) => {
        res.json({token, user});
    });
});

app.post('/searchUsers', verifyToken, (req, res) => {
    User.find({'username': {$regex: req.body.input, $options: 'i'}}).exec()
    .then(row => {     
        res.json(row);
    })
    .catch(err => { res.json(err);
    });
});

app.post('/friendRequest', verifyToken, (req, res) => {
    // Get user via JWT header
    jwt.verify(req.token, 'wSh947xzgG7J', (err, user) => {
        if(err) {
            res.sendStatus(403);
        } else {
            User.find({'username': req.body.data.requestee}).exec()
            .then(requestee => {
                Request.find( { $or: [ {'requestee': requestee[0]._id, 'requester': user.user._id}, {'requestee': user.user._id, 'requester': requestee[0]._id} ] } ).exec().then(result => {
                    console.log(result);
                    if(result.length > 0) {
                        res.sendStatus(409);
                    } else {
                        let request = new Request();
                        request.requester = user.user._id;
                        request.requestee = requestee[0]._id;
                        request.status = 0;
                        request.save(function(err) {
                            if(err){
                                console.log(err);
                            } else {
                                console.log("success");
                                res.sendStatus(200);
                            }
                        });
                    }
                })
            })
            .catch(err => { 
                res.json(err);
            });
        }
    })
});

app.post('/getRequests', verifyToken, async (req, res) => {
    // Get user via JWT header
    let user = await jwt.verify(req.token, 'wSh947xzgG7J');
    if (user) {
      let requests = await Request.find({'requestee': user.user._id}).exec(); // Requests
      if (!requests) {
        //send json error whatever i dont give a shit
      }
      
      let i;
      for (i = 0; i < requests.length; i++) {
          let result = await User.find({'_id': requests[i].requester}).exec(); // you could do array map or something idk
          requests[i].requester = result[0].username;
      } 
      res.json(requests);
    } else {
      res.sendStatus(403);
    }
});

// Verify Token
function verifyToken(req, res, next) {
    // Get auth header
    const bearerHeader = req.headers['authorization'];
    // Check if bearer is undefined
    if(typeof bearerHeader !== 'undefined') {
      // Split at the space
      const bearer = bearerHeader.split(' ');
      // Get token from array
      const bearerToken = bearer[1];
      // Set the token
      req.token = bearerToken;
      next();
    } else {
      // Forbidden
      res.sendStatus(403);
    }
}

module.exports = app;