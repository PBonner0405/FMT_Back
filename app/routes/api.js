const express = require('express');
const router = express.Router();
const Stock = require('../model/stock');
const History = require('../model/history');
const UserInfo = require("../model/user_detail");
const Portfolio = require("../model/portfolio");
const Q = require("Q");

var ObjectID = require('mongodb').ObjectID;
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cors());
var yahooStockPrices = require('yahoo-stock-prices');
var unirest = require('unirest');   //to get  yahoo stock price
const https = require('https');
const request = require('request');

// router.get('/getstocks', function(req, res){
//     //http://finance.google.com/finance/feeds/
//     /*  unirest.get("https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-detail?region=US&lang=en&symbol=NBEV")
//         .header("X-RapidAPI-Key", "fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987")
//         .end(function (result) {
//         console.log(result.status, result.headers, result.body);
//         });  */
//     // yahoo X-RapidApi-Key  fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987
//     // should have to pay to use yahoo
//     // unirest.get("https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-detail?region=US&lang=en&symbol=NBEV")
//     //     .header("X-RapidAPI-Key", "fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987")
//     //     .end(function (result) {
//     //             console.log(result.status, result.headers, result.body);
//     //     }
//     // );
    
//     const request = require('request');
//         request('http://finance.google.com/finance/feeds/', { json: true }, (err, result, body) => {
//         if (err) { return console.log(err); }
//         console.log(body);
//         console.log(body.explanation);
//         res.send("success");
//     });
// });

// router.post('/getstockinfo', function(req, res){

//     // start month, start day, start year, end month, end day, end year, ticker, frequency
//     // month [ 0 -> 11 ] = [ January -> December ]
//     yahooStockPrices.getHistoricalPrices(0, 1, 2019, 3, 1, 2019, req.body.stock, '1d', function(err, prices){
//         if(err) throw err;
//         console.log(prices);
//         res.send(prices);
//     });

//     yahooStockPrices.getCurrentPrice(req.body.stock, function(err, price){
//         if(err) throw err;
//         console.log(prices);
//         res.send(prices);
//     });
// });

/************Update UserInfo with Username*******************/
function updateUserInfo(_username, _updateValue,res, key){                              //key => 1: userinfo key=>2: ...
    UserInfo.updateOne({username:_username}, _updateValue, function(error, result) {
        if (error) {
            res.send(error);
        } else {
            console.log(result);
            if(result.nModified){
                res.send("success")
            } else{
                res.send("You are not Registered User \n Please register first");
            }
        }
    })
}
/***********************************************************/

//***********Add New Stock by User*************//
function saveNewStock(_name,_hist_content, _username, res){
    let _new = new Stock({
        _name: _name,
        _history: _hist_content
    });
    _new.save(
        function(err, stock){
            console.log("new stock is saving...");
            if(err){
                console.log(err);
                res.send(err.errmsg);
            } else {
                console.log("stock saved!", stock, _username);
                let _updateValue =  {$push: {stocks: stock._id}};
                updateUserInfo(_username, _updateValue, res, 1);
            }
        }
    )
}

router.post('/addnewstock', function(req, res){
    let _name = req.body._name;                 //new stock name
    let _histArray = req.body._histArray;       //stock history with date&price
    let _username = req.body._username;         //username who has this stock(this is called when user adds new stock)
    var cnt = 0;

    Stock.findOne({_name: _name})               //check if new stock is already exist
    .then(result => {
        if(result != null && result.length > 0){                  //if exist...
            res.send("This Stock is already exist.\n Would you like to update stock history?");
        } else {                                  //if not exist...
            var _hist_content = [];
            for(var i = 0 ; i < _histArray.length ; i ++){
                //save history data to histories db and return it's objectID
                let data = new History({
                    price: _histArray[i].price,
                    profit: _histArray[i].profit,
                    date: _histArray[i].date
                });
            
                data.save(function(err, re){
                    if(err){
                        res.send("Something went wrong while saving histories...");
                    } else {
                        console.log("hist:res::", re);
                        _hist_content.push(re._id);
                        cnt ++;
                        if(cnt == _histArray.length){
                            saveNewStock(_name, _hist_content, _username, res)
                        }
                    }
                });
            }
        }
    })
    .catch(err => {
        console.log("erro while finding stock", err);
        res.send(err);
    })
});

router.post("/addTStrategy", function(req, res){                    //add users trading strategy
    const _username = req.body._username;                           //user name
    const _TSContent = req.body._tscontent;                         //trading strategy content
    console.log(_username, _TSContent);
    let _updateValue =  {$set: {t_strategy: _TSContent}};
    updateUserInfo(_username, _updateValue, res, 1);
});

router.post("/addPortfolio", function(req, res){                    //add users portfolio
    const _username = req.body._username;                           //user name
    const _title = req.body._title;                                 //portfolio title
    const _comment = req.body._comment;                             //portfolio comment
    const _stockArray = req.body._stockArray;                       //stocks in user's portfolio
    const _pf_date = req.body._date;                                //date of current portfolio completed

    console.log(_username, _title);
    Portfolio.findOne({title: _title})
    .then(result => {
        if(result != null && result.length > 0){                  //if exist...
            res.send("This Portfolio Title is already taken.");
        } else {
            var data = new Portfolio({
                title: _title,
                comment: _comment,
                stocks: [],
                likes: 0,
                date: _pf_date
            });
            var cnt = 0;
            for(var i = 0 ; i < _stockArray.length ; i ++){
                Stock.findOne({_name: _stockArray[i]})
                .then(stock => {
                    if(stock != null){
                        data.stocks.push(stock._id);
                        cnt ++;
                        if(cnt == _stockArray.length){
                            data.save(function(er, portfolio){
                                if(er){
                                    console.log("something went wrong??", er);
                                    res.send(er.errmsg);
                                } else {
                                    console.log("saved portfolio", portfolio);
                                    let _updateValue =  {$push: {portfolios: portfolio._id}};
                                    updateUserInfo(_username, _updateValue, res, 1);            //add saved portfolio to user
                                }
                            })
                        }
                    }
                })
                .catch(err => {
                    res.send(err.errmsg);
                })
            }
        }
    })
    .catch(error => {
        res.send(error.errmsg);
    })
});

module.exports = router;