const express = require('express');
const router = express.Router();
const User = require('../model/user');
const UserInfo = require("../model/user_detail");
const bcrypt = require('bcryptjs');
const passport = require('passport');

//register form
router.get('/register', function(req, res){
  res.send('register')
});

router.post('/register', function(req, res){
//   const name = req.body.name;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  
//   req.checkBody('name', 'Name is Required').notEmpty();
  req.checkBody('email', "Email is required").notEmpty();
  req.checkBody("email", "Email is not valid").isEmail();
  req.checkBody('username', "Username is required").notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();

  let errors = req.validationErrors();

  if(errors){
    res.send(errors);
  } else {
    UserInfo.find({username:username})
    .then(result => {
        if(result.length > 0){                  //if exist...
            res.send("Username Already Exist...");
        } else {
            let _userDetail = new UserInfo({
                username: username,
                stocks: [],
                t_strategy: "",
                portfolios: []
            });
            _userDetail.save(function(er, rst){
                if(er){
                    res.send(er);
                } else {
                    let newUser = new User({
                        // name: name,
                        email: email,
                        username: username,
                        password: password,
                    });
                    bcrypt.genSalt(10, function(err, salt){
                        bcrypt.hash(newUser.password, salt, function(err, hash){
                            if(err){
                                res.send(err);
                            }
                            newUser.password = hash;
                
                            User.find({email: newUser.email, username: newUser.username})
                            .then(result => {
                                if(result.length > 0){
                                    res.send("duplicate email or username");
                                } else {
                                    newUser.save(function(error, user){
                                        if(error){
                                            res.send(error);
                                        } else{
                                            res.send("success");
                                        }
                                    });
                                }
                            })
                            .catch(err => {
                            })
                
                        });
                    });
                }
            })
        }
    })
    .catch(err => {
        res.send(err);
    })
  }
});

//Login Form
router.get('/login', function(req, res){
    res.send('login');
});

//Login Process
router.post('/login', function(req, res, next){
    let query = {username: req.body.username};
    User.findOne(query, function(err, result){
        if(err) res.send(err);
        if(!result) res.send("no user found!");
        if(result){
            console.log(result);
            console.log(result.password);
            bcrypt.compare(req.body.password, result.password, function(err, isMatch){
                if(err) throw err;
                if(isMatch){
                    res.send("Login success!");
                } else {
                    res.send("Incorrect Password");
                }
            });
        }
    });
});

router.get('/logout', function(req, res){
    req.logout();
    res.send('success');
});

module.exports = router;