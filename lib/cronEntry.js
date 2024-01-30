// @ts-check
const {Elf} = require('xcraft-core-goblin');
const {string, enumeration} = require('xcraft-core-stones');
const {CronJob} = require('cron');

class MetaShape {
  status = enumeration('published', 'trashed');
}

class CronEntryShape {
  id = string;
  meta = MetaShape;
  time = string;
}

class CronEntryState extends Elf.Sculpt(CronEntryShape) {}

class CronEntryLogic extends Elf.Archetype {
  static db = 'chronomancer';
  state = new CronEntryState();

  create(id, name, time) {
    const {state} = this;
    state.id = id;
    state.time = time;
  }

  revive() {
    this.state.meta.status = 'published';
  }

  trash() {
    this.state.meta.status = 'trashed';
  }
}

class CronEntry extends Elf {
  logic = Elf.getLogic(CronEntryLogic);
  state = new CronEntryState({
    meta: {
      status: 'published',
    },
  });

  /**
   * @param {*} id cronEntry@<hash>
   * @param {*} desktopId desktop id
   * @param {string} [time] cronTime
   * @returns {Promise<this>} this
   */
  async create(id, desktopId, time) {
    this.logic.create(id, time);
    await this.persist();
    return this;
  }

  async start() {}

  async stop() {}

  async revive() {
    this.logic.revive();
    await this.persist();
  }

  async trash() {
    this.logic.trash();
    await this.persist();
  }

  delete() {}
}

module.exports = {CronEntry, CronEntryLogic};
