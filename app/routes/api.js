const express = require('express');
const router = express.Router();
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

router.get('/getstocks', function(req, res){
    //http://finance.google.com/finance/feeds/
    /*  unirest.get("https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-detail?region=US&lang=en&symbol=NBEV")
        .header("X-RapidAPI-Key", "fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987")
        .end(function (result) {
        console.log(result.status, result.headers, result.body);
        });  */
    // yahoo X-RapidApi-Key  fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987
    // should have to pay to use yahoo
    // unirest.get("https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-detail?region=US&lang=en&symbol=NBEV")
    //     .header("X-RapidAPI-Key", "fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987")
    //     .end(function (result) {
    //             console.log(result.status, result.headers, result.body);
    //     }
    // );
    
    const request = require('request');
        request('http://finance.google.com/finance/feeds/', { json: true }, (err, result, body) => {
        if (err) { return console.log(err); }
        console.log(body);
        console.log(body.explanation);
        res.send("success");
    });
});

router.post('/getstockinfo', function(req, res){

    // start month, start day, start year, end month, end day, end year, ticker, frequency
    // month [ 0 -> 11 ] = [ January -> December ]
    yahooStockPrices.getHistoricalPrices(0, 1, 2019, 3, 1, 2019, req.body.stock, '1d', function(err, prices){
        if(err) throw err;
        console.log(prices);
        res.send(prices);
    });

    yahooStockPrices.getCurrentPrice(req.body.stock, function(err, price){
        if(err) throw err;
        console.log(prices);
        res.send(prices);
    });
});

module.exports = router;