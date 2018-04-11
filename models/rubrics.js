const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const stringField = {
    type: String,
    minlength: 1,
    maxlength: 100,
};

const RubricSchema = new Schema({
    sectionIds: [String],
    assignmentDate: Date,
    assignmentTitle: stringField,
    
    /*
    //list of these
    item: stringField,
    description: stringField,
    points: [Number], */
});

module.exports = mongoose.model('Rubrics', RubricSchema);