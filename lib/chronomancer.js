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

  async insert(name, cronTime, command, payload) {
    const id = SmartId.from('cronEntry', name);
    await new CronEntry(this).create(
      id,
      this._desktopId,
      cronTime,
      command,
      payload
    );
  }

  async remove(name) {
    const id = SmartId.from('cronEntry', name);
    try {
      const cronEntry = await new CronEntry(this).create(id, this._desktopId);
      await cronEntry.trash();
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  async start(name) {
    const id = SmartId.from('cronEntry', name);
    try {
      const cronEntry = await new CronEntry(this).create(id, this._desktopId);
      await cronEntry.start();
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }

  async stop(name) {
    const id = SmartId.from('cronEntry', name);
    try {
      const cronEntry = await new CronEntry(this).create(id, this._desktopId);
      await cronEntry.stop();
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
  }
}

module.exports = {Chronomancer, ChronomancerLogic};
