const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    interestedBike: {
        type: String,
        required: true
    }
});

const Buyer = mongoose.model('Buyer', buyerSchema);

module.exports = Buyer;
