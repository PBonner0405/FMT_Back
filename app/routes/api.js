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

/*********************************************************
 * Update Info with User name/portfolio Title/stock Name *
 * ******************************************************/
function editInfo(sIndex, _updateValue,res, key){                              //key => 1: userinfo key=>2: portfolio key=>3: stock history
    switch(key){
        case 1: //user data
            UserInfo.updateOne({username:sIndex}, _updateValue, function(error, result) {
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
        break;

        case 2: //portfolio info
            Portfolio.updateOne({title:sIndex}, _updateValue, function(error, result) {
                if (error) {
                    res.send(error);
                } else {
                    console.log(result);
                    if(result.nModified){
                        res.send("success")
                    } else{
                        res.send("Something went wrong... \n Please try again.");
                    }
                }
            })
        break;
            
        case 3: //stock history
            Stock.updateOne({_name:sIndex}, _updateValue, function(error, result) {
                if (error) {
                    res.send(error);
                } else {
                    console.log(result);
                    if(result.nModified){
                        res.send("success")
                    } else{
                        res.send("Something went wrong... \n Please try again.");
                    }
                }
            })
        break;
    }
    
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
                editInfo(_username, _updateValue, res, 1);
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
    editInfo(_username, _updateValue, res, 1);
});

router.post("/addPortfolio", function(req, res){                    //add users portfolio
    const _username = req.body._username;                           //user name
    const _title = req.body._title;                                 //portfolio title
    const _comment = req.body._comment;                             //portfolio comment
    const _stockArray = req.body._stockArray;                       //stocks with count in user's portfolio {stockName, CNT}
    const _pf_date = req.body._date;                                //date of current portfolio completed

    console.log(_username, _title);
    Portfolio.findOne({title: _title})
    .then(result => {
        if(result != null && result.length > 0){                    //if exist...
            res.send("This Portfolio Title is already taken.");
        } else {
            var data = new Portfolio({
                title: _title,
                comment: _comment,
                stocks: [],                                         //{sID, sCount}
                likes: 0,
                date: _pf_date
            });
            var cnt = 0;
            console.log(_stockArray, _stockArray.length);
            for(var i = 0 ; i < _stockArray.length ; i ++){
                console.log(_stockArray[i].stockName, _stockArray[i].CNT);
                Stock.findOne({_name: _stockArray[i].stockName})
                .then(stock => {
                    if(stock != null){
                        let _value = { sID: stock._id, sCount:_stockArray[cnt].CNT };
                        data.stocks.push(_value);
                        cnt ++;
                        console.log(data);
                        if(cnt == _stockArray.length){
                            data.save(function(er, portfolio){
                                if(er){
                                    console.log("something went wrong??", er);
                                    res.send(er.errmsg);
                                } else {
                                    console.log("saved portfolio", portfolio);
                                    let _updateValue =  {$push: {portfolios: portfolio._id}};
                                    editInfo(_username, _updateValue, res, 1);            //add saved portfolio to user
                                }
                            })
                        }
                    } else {
                        console.log("what's wrong?");
                        res.send("error");
                        return;
                    }
                })
                .catch(err => {
                    console.log(err);
                    res.send(err.errmsg);
                })
            }
        }
    })
    .catch(error => {
        res.send(error.errmsg);
    })
});

router.post("/getUserStocks", function(req, res){                   //get stocks for a registered user
    const _username = req.body._username;                           //user name

    UserInfo.find({username:_username})
    .then( result => {
        if(result != null && result.length > 0){
            let _userStocks = result[0].stocks;
            // console.log(result,_userStocks);
            if(_userStocks.length > 0){
                var cnt = 0;
                var _stockArray = [];
                _userStocks.forEach(element => {
                    Stock.findOne({_id: element})
                    .then(result => {
                        console.log("stock::", result);
                        
                        var hcnt = 0;
                        var stock = {
                            stockName: result._name,
                            shistory : []
                        }
                        result._history.forEach(item => {
                            History.findOne({_id: item})
                            .then(history => {
                                console.log("hist:::", history);
                                stock.shistory.push(history);
                                hcnt ++;
                                if(hcnt == result._history.length){
                                    _stockArray.push(stock);
                                    cnt ++;
                                }
                                if(cnt == _userStocks.length){
                                    res.send(_stockArray);
                                }
                            })
                            .catch(err => {
                                console.log(err);
                                res.send("error");
                            })
                        })
                        
                    })
                    .catch(err => {
                        console.log(err);
                    })

                    // res.send(_userStocks);
                });
            } else {
                res.send("No stocks found");
            }
        } else {
            res.send("Cannot find " + _username);
        }
    })
    .catch( error => {
        console.log(error);
        res.send( _username +" is not the registered user");
    });
});

router.post("/getUserTS", function(req, res){                   //get stocks for a registered user
    const _username = req.body._username;                           //user name

    UserInfo.find({username:_username})
    .then( result => {
        if(result != null && result.length > 0){
            let _userTS = result[0].t_strategy;
            // console.log(result,_userStocks);
            res.send(_userTS)
        } else {
            res.send("Cannot find " + _username);
        }
    })
    .catch( error => {
        console.log(error);
        res.send( _username +" is not the registered user");
    });
});

router.post("/getUserPortfolios", function(req, res){                   //get stocks for a registered user
    const _username = req.body._username;                           //user name

    UserInfo.find({username:_username})
    .then( result => {
        if(result != null && result.length > 0){
            let _userPortfolios = result[0].portfolios;
            // console.log(result,_userPortfolios);
            if(_userPortfolios.length > 0){
                var cnt = 0;
                var _portfolioArray = [];
                _userPortfolios.forEach(element => {
                    Portfolio.findOne({_id: element})
                    .then(result => {
                        console.log("portfolio::", result);
                        
                        var sCnt = 0;
                        var m_stocks = [];
                        result.stocks.forEach(item => {
                            Stock.findOne({_id: item.sID}, function(m_err, m_res){
                                if(m_err){
                                    res.send("failed");
                                } else {
                                    sCnt ++;
                                    m_stocks.push(m_res._name);
                                    if(sCnt == result.stocks.length){
                                        cnt ++;
                                        let m_result = {
                                            likes: result.likes,
                                            title: result.title,
                                            comment: result.comment,
                                            date: result.date,
                                            stocks: m_stocks
                                        }
                                        _portfolioArray.push(m_result);
                                        if(cnt == _userPortfolios.length){
                                            res.send(_portfolioArray);
                                        }
                                    }
                                }
                            })
                        })
                        
                    })
                    .catch(err => {
                        console.log(err);
                    })

                    // res.send(_userPortfolios);
                });
            } else {
                res.send("No stocks found");
            }
        } else {
            res.send("Cannot find " + _username);
        }
    })
    .catch( error => {
        console.log(error);
        res.send( _username +" is not the registered user");
    });
});

router.post("/editPortfolio", function(req, res){                   // add|edit|delete portfolio stock
    const _username = req.body._username;                           //user name
    const _pTitle = req.body._title;                                //portfolio title
    const _cmd = req.body._cmd;                                     //1: add new stock
                                                                    //2: delete stock
                                                                    //3: edit stock
    const _data = req.body._data;                                   //editing content
    // let _updateValue =  {$push: {portfolios: portfolio._id}};
    // editInfo(_username, _updateValue, res, 1);
    switch(_cmd){
        case 1:
            /********************************************************
             * _data contains {stock, shares, profit, price} *
             *******************************************************/
            console.log("cmd:", 1);
            let history = new History({
                price: _data.price,
                profit: _data.profit,
                date: Date.now()
            });
        
            history.save(function(error, result){
                if(error){
                    res.send("error");
                } else {
                    console.log("hist:res::", result, result._id);
                    let _updateValue = {$push: {_history: result._id}}
                    Stock.updateOne({_name: _data.stock}, _updateValue, function(err, re){
                        if(err){
                            res.send("error");
                        } else {
                            if(re.nModified){
                                Stock.findOne({_name: _data.stock}, function(m_err, m_res){
                                    if(m_err){
                                        res.send("error");
                                    } else {
                                        let _updatePValue = {$push: {stocks: {sID: m_res._id, sCount: _data.shares}}};
                                        editInfo(_pTitle, _updatePValue, res, 2);
                                    }
                                })
                            }
                            else {
                                res.send("error");
                            }
                            
                        }
                    })
                }
            });
        break;

        case 2:
            /********************************************************
             * _data contains {stock} *
             *******************************************************/
            console.log("cmd:", 2);
            Stock.findOne({_name: _data.stock}, function(error, result){
                if(error){
                    res.send("error");
                } else {
                    let _updatePValue = {$pull: {stocks: {sID: result._id}}};
                    editInfo(_pTitle, _updatePValue, res, 2);
                }
            })
        break;

        case 3:
            /********************************************************
             * _data contains {stock, shares, profit, price} *
             *******************************************************/
            console.log("cmd:", 3);
            let hist = new History({
                price: _data.price,
                profit: _data.profit,
                date: Date.now()
            });
        
            hist.save(function(error, result){
                if(error){
                    res.send("error");
                } else {
                    console.log("hist:res::", result);
                    let _updateValue = {$push: {_history: result._id}}
                    Stock.updateOne({_name: _data.stock}, _updateValue, function(err, re){
                        if(err){
                            res.send("error");
                        } else {
                            Stock.findOne({_name: _data.stock}, function(m_err, m_res){
                                if(m_err){
                                    res.send("error");
                                }
                                else {
                                    console.log(m_res._id, _data.shares);
                                    let _updatePValue = {$set: {"stocks.$": {sID: m_res._id, sCount: _data.shares}}};
                                    Portfolio.updateOne({title:_pTitle, "stocks.sID":m_res._id}, _updatePValue, function(error, result) {
                                        if (error) {
                                            res.send(error);
                                        } else {
                                            console.log(result);
                                            if(result.nModified){
                                                res.send("success")
                                            } else{
                                                res.send("Something went wrong... \n Please try again.");
                                            }
                                        }
                                    })
                                }                                
                            })                            
                        }
                    })
                }
            });
        break;
    }
});

module.exports = router;