const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;
const expressValidator = require('express-validator');
const passport = require('passport');
mongoose.Promise = global.Promise;
const cors = require('cors');
const config = require('./app/config/database');

var app = express();

mongoose.connect(config.dburl);
let db = mongoose.connection;

//check Mongodb Connection 
db.once('open', function(){
    console.log("Connected to MongoDB");

    app.use(cors());

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(session({
        cookie: { maxAge: 60000 },
        secret: '321654987',
        saveUninitialized: false,
        resave: false
    }));

    //Express Messages Middleware
    app.use(flash());
    app.use(function(req, res, next){
        res.locals.messages = require('express-messages')(req, res);
        next();
    });

    app.use((req, res, next) => {
        res.locals.success_messages = req.flash('success');
        res.locals.error_messages = req.flash('error');
        res.locals.isAuthenticated = req.user ? true : false;
        next();
    });

    //Express Validator Middleware
    app.use(expressValidator({
        errorFormatter: function(param, msg, value){
            var namespace = param.split('.')
            , root = namespace.shift()
            , formParam = root;

            while(namespace.length) {
                formParam += '[' + namespace.shift() + ']';
            }
            return {
                param : formParam,
                msg : msg,
                value : value
            };
        }
    }));

    //passport Config
    require('./app/config/passport')(passport);
    //Passport Middleware
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('*', function(req, res, next){
        res.locals.user = req.user||null;
        next();
    });

    app.use('/', require('./app/routes/router'));
    app.use('/users', require('./app/routes/users'));
    app.use('/api', require('./app/routes/api'));

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
        return res.send("This is just for api");
    });

    var server = app.listen(3001, () => console.log('Server started listening on port 3001'));
});

//check for DB Errors
db.on('error', function(err){
  console.log("what's wrong???",err);
});

module.exports = app;
