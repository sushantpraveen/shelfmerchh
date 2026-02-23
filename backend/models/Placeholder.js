const mongoose = require('mongoose');

const PlaceholderSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CatalogProduct',
        required: true,
        index: true
    },
    view: {
        type: String,
        required: true,
        index: true
    },
    placeholderId: {
        type: String,
        required: true
    },
    placeholderName: {
        type: String,
        required: true
    },
    placeholderColor: {
        type: String,
        required: true
    },
    xIn: Number,
    yIn: Number,
    widthIn: Number,
    heightIn: Number,
    rotationDeg: Number,
    scale: Number,
    lockSize: Boolean,
    shapeType: String,
    polygonPoints: [mongoose.Schema.Types.Mixed],
    renderPolygonPoints: [mongoose.Schema.Types.Mixed],
    shapeRefinement: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Placeholder', PlaceholderSchema);
