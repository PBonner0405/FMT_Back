var mongoose = require('mongoose');
var HistorySchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true,
        trim: true,
    }
});
var History = mongoose.model('History', HistorySchema);
module.exports = History;