var mongoose = require('mongoose');
var StockSchema = new mongoose.Schema({
  _name: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  _history: []
});
var Stock = mongoose.model('Stock', StockSchema);
module.exports = Stock;