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
  _desktopId = 'system@chronomancer';

  async init() {}

  async insert(name, cronTime) {
    const id = SmartId.from('cronEntry', name);
    await new CronEntry(this).create(id, this._desktopId, cronTime);
  }

  async remove(name) {
    const id = SmartId.from('cronEntry', name);
    // TODO: check if exists
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.trash();
  }

  async start(name) {
    const id = SmartId.from('cronEntry', name);
    // TODO: check if exists
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.start();
  }

  async stop(name) {
    const id = SmartId.from('cronEntry', name);
    // TODO: check if exists
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.stop();
  }
}

module.exports = {Chronomancer, ChronomancerLogic};
