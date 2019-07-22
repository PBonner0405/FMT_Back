var mongoose = require('mongoose');
var UserDetailSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  stocks: [],
  t_strategy: {
    type: String,
  },
  portfolios: [],
  deposit: {
    type: Number
  }
});
var UserInfo = mongoose.model('UserInfo', UserDetailSchema);
module.exports = UserInfo;