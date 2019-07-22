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
//         });  */
//     // yahoo X-RapidApi-Key  fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987
//     // should have to pay to use yahoo
//     // unirest.get("https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-detail?region=US&lang=en&symbol=NBEV")
//     //     .header("X-RapidAPI-Key", "fd695e4121mshd621670d4433da9p1d9c65jsndb9b07bb8987")
//     //     .end(function (result) {
//     //     }
//     // );
    
//     const request = require('request');
//         request('http://finance.google.com/finance/feeds/', { json: true }, (err, result, body) => {
//         res.send("success");
//     });
// });

// router.post('/getstockinfo', function(req, res){

//     // start month, start day, start year, end month, end day, end year, ticker, frequency
//     // month [ 0 -> 11 ] = [ January -> December ]
//     yahooStockPrices.getHistoricalPrices(0, 1, 2019, 3, 1, 2019, req.body.stock, '1d', function(err, prices){
//         if(err) throw err;
//         res.send(prices);
//     });

//     yahooStockPrices.getCurrentPrice(req.body.stock, function(err, price){
//         if(err) throw err;
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
            if(err){
                res.send(err.errmsg);
            } else {
                let _updateValue =  {$push: {stocks: stock._id}};
                editInfo(_username, _updateValue, res, 1);
            }
        }
    )
}

/****************Update Stock history **********************/
function updateStock(_id,_hist_content){
    //update stock history
    //save history data to histories db and return it's objectID
    let data = new History({
        price: _hist_content.price,
        date: _hist_content.date
    });
    data.save(function(err, res){
        if(err != null){
        } else {
            // res._id
            let _updateValue =  {$push: {_history: res._id}};
            Stock.updateOne({_id, _id}, _updateValue, (er, re)=>{
                return true;
            })
            .catch(err=> {
                return false;
            });
        }
    });
}

/***Add New Stock */
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
                    date: _histArray[i].date
                });
            
                data.save(function(err, re){
                    if(err){
                        res.send("Something went wrong while saving histories...");
                    } else {
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
        res.send(err);
    })
});

router.post("/addTStrategy", function(req, res){                    //add users trading strategy
    const _username = req.body._username;                           //user name
    const _TSContent = req.body._tscontent;                         //trading strategy content
    let _updateValue =  {$set: {t_strategy: _TSContent}};
    editInfo(_username, _updateValue, res, 1);
});

router.post("/addPortfolio", function(req, res){                    //add users portfolio
    const _username = req.body._username;                           //user name
    const _title = req.body._title;                                 //portfolio title
    const _comment = req.body._comment;                             //portfolio comment
    const _stockArray = req.body._stockArray;                       //stocks with count in user's portfolio {stockName, CNT}
    const _pf_date = req.body._date;                                //date of current portfolio completed
    const _cash = req.body._cash;                                   //initial cash

    Portfolio.findOne({title: _title})
    .then(result => {
        if(result != null && result.length > 0){                    //if exist...
            res.send("This Portfolio Title is already taken.");
        } else {
            var data = new Portfolio({
                title: _title,
                cash: _cash,
                comment: _comment,
                stocks: [],                                         //{sID, sCount}
                likes: 0,
                date: _pf_date
            });
            var cnt = 0;
            for(var i = 0 ; i < _stockArray.length ; i ++){
                Stock.findOne({_name: _stockArray[i].stockName})
                .then(stock => {
                    if(stock != null){
                        let _value = { sID: _stockArray[cnt].stockName, sCount:_stockArray[cnt].CNT, buy: _stockArray[cnt].buy, date: _stockArray[cnt].date, price: _stockArray[cnt].price };
                        data.stocks.push(_value);
                        cnt ++;
                        if(cnt == _stockArray.length){
                            data.save(function(er, portfolio){
                                if(er){
                                    res.send(er.errmsg);
                                } else {
                                    let _updateValue =  {$push: {portfolios: portfolio._id}};
                                    editInfo(_username, _updateValue, res, 1);            //add saved portfolio to user
                                }
                            })
                        }
                    } else {
                        res.send("error");
                        return;
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

router.post("/getUserStocks", function(req, res){                   //get stocks for a registered user
    const _username = req.body._username;                           //user name

    UserInfo.find({username:_username})
    .then( result => {
        if(result != null && result.length > 0){
            let _userStocks = result[0].stocks;
            if(_userStocks.length > 0){
                var cnt = 0;
                var _stockArray = [];
                _userStocks.forEach(element => {
                    Stock.findOne({_id: element})
                    .then(result => {
                        
                        var hcnt = 0;
                        var stock = {
                            stockName: result._name,
                            shistory : []
                        }
                        result._history.forEach(item => {
                            History.findOne({_id: item})
                            .then(history => {
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
                                res.send("error");
                            })
                        })
                        
                    })
                    .catch(err => {
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
        res.send( _username +" is not the registered user");
    });
});

router.post("/getUserTS", function(req, res){                   //get stocks for a registered user
    const _username = req.body._username;                           //user name

    UserInfo.find({username:_username})
    .then( result => {
        if(result != null && result.length > 0){
            let _userTS = result[0].t_strategy;
            res.send(_userTS)
        } else {
            res.send("Cannot find " + _username);
        }
    })
    .catch( error => {
        res.send( _username +" is not the registered user");
    });
});

router.post("/getUserPortfolios", function(req, res){                   //get stocks for a registered user
    const _username = req.body._username;                           //user name

    UserInfo.find({username:_username})
    .then( result => {
        if(result != null && result.length > 0){
            let _userPortfolios = result[0].portfolios;
            
            if(_userPortfolios.length > 0){
                var cnt = 0;
                var _portfolioArray = [];
                _userPortfolios.forEach(element => {
                    Portfolio.findOne({_id: element})
                    .then(result => {
                        if(result.stocks == null){
                            cnt++;
                            let m_result = {
                                likes: parseFloat(result.likes),
                                title: result.title,
                                comment: result.comment,
                                date: result.date,
                                cash: result.cash,
                                stocks: []
                            }
                            _portfolioArray.push(m_result);
                            if(cnt == _userPortfolios.length){
                                res.send(_portfolioArray);
                            }
                        }
                        else {
                            var sCnt = 0;
                            var m_stocks = [];
                            result.stocks.forEach(item => {
                                sCnt ++;
                                var m_stock = {
                                    stock: item.sID,
                                    cnt: item.sCount,
                                    buy: item.buy,
                                    date: item.date,
                                    price: parseFloat(item.price),
                                }
                                m_stocks.push(m_stock);
                                if(sCnt == result.stocks.length){
                                    cnt ++;
                                    let m_result = {
                                        likes: parseFloat(result.likes),
                                        title: result.title,
                                        comment: result.comment,
                                        date: result.date,
                                        cash: result.cash,
                                        stocks: m_stocks
                                    }
                                    _portfolioArray.push(m_result);
                                    if(cnt == _userPortfolios.length){
                                        res.send(_portfolioArray);
                                    }
                                }
                            })
                        }
                    })
                    .catch(err => {
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
            let history = new History({
                price: _data.price,
                date: _data.date,
            });

            history.save(function(error, result){
                if(error){
                    res.send("error");
                } else {
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
                                        var search_ind = "stocks."+_data.index+".date";
                                        let _updatePValue = {$push: {stocks: {sID: m_res._name, sCount: _data.shares, buy: _data.buy, date: _data.date, price:_data.price}}};
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
            Stock.findOne({_name: _data.stock}, function(error, result){
                if(error){
                    res.send("error");
                } else {
                    var search_ind = "stocks."+_data.index+".date";
                    let _updatePValue = {$pull: {stocks: {sID: result._name, date: _data.date}}};
                    editInfo(_pTitle, _updatePValue, res, 2);
                }
            })
        break;
        case 3:
            /********************************************************
             * _data contains {stock, shares, profit, price} *
             *******************************************************/
            let hist = new History({
                price: _data.price,
                date: Date.now()
            });
            hist.save(function(error, result){
                if(error){
                    res.send("error");
                } else {
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
                                    // var search_ind = "stocks."+_data.index+".date";
                                    Portfolio.find({title:_pTitle}, function(error, rr) {
                                        var _newStocks = [];
                                        if(rr!==null){
                                            _newStocks = rr[0].stocks;
                                            var _newStock = {sID: _data.stock, sCount: _data.shares, buy: _data.buy, date: _data.date, price:_data.price};
                                            _newStocks[_data.index] = _newStock;
                                        }
                                        let _updatePValue = {"stocks": _newStocks};
                                        Portfolio.updateOne({title:_pTitle}, _updatePValue, function(er, p_res) {
                                            if (er) {
                                                res.send(er);
                                            } else {
                                                if(p_res.nModified){
                                                    res.send("success")
                                                } else{
                                                    res.send("Something went wrong... \n Please try again.");
                                                }
                                            }
                                        })
                                    });
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