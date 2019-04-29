var mongoose = require('mongoose');
var UserDetailSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  stocks: [],
  t_strategy: {
    type: String,
    required: true,
  },
  portfolios: []
});
var UserInfo = mongoose.model('UserInfo', UserDetailSchema);
module.exports = UserInfo;