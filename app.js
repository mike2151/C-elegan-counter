var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var requiresafe = require('requiresafe');
var session = require('express-session');
var passport = require('passport');
var morgan = require('morgan')
var helmet = require('helmet');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wormtraq');
var db = mongoose.connection;

var routes = require('./routes/index');



//init app
var app = express();

//view engine
app.set('views', path.join(__dirname, 'views'));
//middleware

app.set('view engine', 'ejs');



//parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());

app.disable('x-powered-by');

//app.use(morgan('combined'))

//static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

//passsport init
app.use(passport.initialize());
app.use(passport.session());


app.use(expressValidator({
    errorFormatter: function (param, msg, value) {
        var namespace = param.split('.'),
            root = namespace.shift(),
            formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    }
}));

app.use(flash());

//global vars for flash
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    //used for passport
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});
app.use(helmet());



app.use('/', routes);



app.set('port', (process.env.PORT || 3000));

app.listen(app.get('port'), function () {
    console.log('Listening on port ' + app.get('port'));
})
