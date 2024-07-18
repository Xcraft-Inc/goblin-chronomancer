// @ts-check
const {Elf, SmartId} = require('xcraft-core-goblin');
const {string} = require('xcraft-core-stones');
const {CronEntry, CronEntryLogic, CronEntryState} = require('./cronEntry.js');

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

  async init() {
    const ids = Array.from(
      await this.cryo.queryLastActions(CronEntryLogic.db, 'cronEntry', ['id'])
    ).map(({id}) => id);

    for (const id of ids) {
      const cronEntity = await new CronEntry(this).create(id, this._desktopId);
      await cronEntity.start();
    }
  }

  /**
   *
   * @param {string} name
   * @param {string|number} [cronTime]
   * @param {string} [command]
   * @param {object} [payload]
   * @param {CronEntryState["loggingMode"]} [loggingMode]
   */
  async upsert(name, cronTime, command, payload, loggingMode = 'enabled') {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.upsert(cronTime, command, payload, loggingMode);
  }

  async remove(name) {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.trash();
  }

  async start(name) {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.start();
  }

  async stop(name) {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.stop();
  }

  /**
   *
   * @param {string} name
   * @param {boolean} asap run the first time as soon as possible
   */
  async restart(name, asap = false) {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    await cronEntry.stop();
    await cronEntry.start();
    if (asap) {
      await cronEntry.fire();
    }
  }

  async running(name) {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    const running = await cronEntry.running();
    return running;
  }

  async nextDates(name, count = 1) {
    const id = SmartId.from('cronEntry', name);
    const cronEntry = await new CronEntry(this).create(id, this._desktopId);
    const next = await cronEntry.nextDates(count);
    return next;
  }
}

module.exports = {Chronomancer, ChronomancerLogic};
