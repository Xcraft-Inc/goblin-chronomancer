// @ts-check
const {Elf} = require('xcraft-core-goblin');
const {string} = require('xcraft-core-stones');

class CronEntryShape {
  id = string;
}

class CronEntryState extends Elf.Sculpt(CronEntryShape) {}

class CronEntryLogic extends Elf.Archetype {
  static db = 'chronomancer';
  state = new CronEntryState();

  create(id) {
    const {state} = this;
    state.id = id;
  }
}

class CronEntry extends Elf {
  logic = Elf.getLogic(CronEntry);
  state = new CronEntryState();

  /**
   * Create a file (chest object) entry based on hash
   *
   * @param {*} id chestObject@<hash>
   * @param {*} desktopId desktop id
   * @returns {Promise<this>} this
   */
  async create(id, desktopId) {
    this.logic.create(id, desktopId);
    await this.persist();
    return this;
  }

  delete() {}
}

module.exports = {CronEntry, CronEntryLogic};
