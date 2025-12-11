// @ts-check
const {Elf, SmartId} = require('xcraft-core-goblin');
const {string} = require('xcraft-core-stones');
const {
  CronEntry,
  CronEntryShape,
  CronEntryLogic,
  CronEntryState,
} = require('./cronEntry.js');

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
    const crons = await this.cryo.reader(CronEntryLogic.db);
    const ids = crons
      .queryArchetype('cronEntry', CronEntryShape)
      .field('id')
      .all();
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
    if (!(await CronEntryLogic.exist(this.cryo, id))) {
      return;
    }

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

  async getAllEntriesLike(name) {
    const cronEntries = await this.cryo.reader(CronEntryLogic.db);
    return cronEntries
      .queryArchetype('cronEntry', CronEntryShape)
      .fields(['id', 'time', 'command', 'payload'])
      .where((e) => e.get('id').like(`${SmartId.from('cronEntry', name)}%`))
      .all();
  }
}

module.exports = {Chronomancer, ChronomancerLogic};
