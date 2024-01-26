const {Elf} = require('xcraft-core-goblin');
const {Chronomancer, ChronomancerLogic} = require('./lib/chronomancer.js');

exports.xcraftCommands = Elf.birth(Chronomancer, ChronomancerLogic);
