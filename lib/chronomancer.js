// @ts-check
const {Elf, SmartId} = require('xcraft-core-goblin');
const {string} = require('xcraft-core-stones');
const {CronEntry} = require('./cronEntry.js');

class ChronomancerShape {
  id = string;
}

class ChronomancerState extends Elf.Sculpt(ChronomancerShape) {}

class ChronomancerLogic extends Elf.Spirit {
  state = new ChronomancerState({
    id: 'chronomancer',
  });
}

class Chronomancer extends Elf.Alone {
  async init() {}
}

module.exports = {Chronomancer, ChronomancerLogic};
