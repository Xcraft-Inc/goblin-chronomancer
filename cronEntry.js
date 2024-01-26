const {Elf} = require('xcraft-core-goblin');
const {CronEntry, CronEntryLogic} = require('./lib/cronEntry.js');

exports.xcraftCommands = Elf.birth(CronEntry, CronEntryLogic);
