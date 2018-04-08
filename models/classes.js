const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stringField = {
    type: String,
    minlength: 1,
    maxlength: 50,
};

const ClassSchema = new Schema({
    instructors: [String],
    name: stringField,
    // sectionIds: [Number],
    //consider where to put rubrics, sections 
});

module.exports = mongoose.model('Classes', ClassSchema);