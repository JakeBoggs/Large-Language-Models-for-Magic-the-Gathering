const fs = require('fs');

const descriptions = JSON.parse(fs.readFileSync('./data/Descriptions.json').toString());
const rulings = JSON.parse(fs.readFileSync('./data/Rulings.json').toString());
const interactions = JSON.parse(fs.readFileSync('./data/Interactions.json').toString());

fs.writeFileSync('./data/Dataset.json', JSON.stringify(descriptions.concat(rulings).concat(interactions), null, '\t'));