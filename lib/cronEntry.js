// @ts-check
const {Elf} = require('xcraft-core-goblin');
const {string, object, enumeration} = require('xcraft-core-stones');
const {CronJob} = require('cron');

class CronError extends Error {
  code = '';

  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

class MetaShape {
  status = enumeration('published', 'trashed');
}

class CronEntryShape {
  id = string;
  meta = MetaShape;
  time = string;
  command = string;
  payload = object;
}

class CronEntryState extends Elf.Sculpt(CronEntryShape) {}

class CronEntryLogic extends Elf.Archetype {
  static db = 'chronomancer';
  state = new CronEntryState();

  create(id, time, command, payload) {
    const {state} = this;
    state.id = id;
    state.time = time;
    state.command = command;
    state.payload = payload;
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

  _cronJob;
  _error = null;

  /**
   * @param {*} id cronEntry@<hash>
   * @param {*} desktopId desktop id
   * @param {string} [time] cronTime
   * @param {string} [command] Xcraft command call
   * @param {object|undefined} [payload] data passed with the command
   * @returns {Promise<this>} this
   */
  async create(id, desktopId, time, command, payload) {
    if (!time || !command) {
      const err = new CronError(
        'ENOENT',
        'Are you trying to create an unexistant cronEntry?'
      );
      throw err;
    }
    this.logic.create(id, time, command, payload);
    await this.persist();
    return this;
  }

  async start() {
    if (this._cronJob) {
      this._cronJob.start();
      return;
    }

    const resp = this.quest.newResponse('chronomancer', 'token');
    const {state} = this;
    this._cronJob = new CronJob(
      state.time,
      async () => {
        try {
          await resp.command.send(state.command, state.payload);
          this._error = null;
        } catch (ex) {
          this._error = ex;
        }
      },
      null,
      true
    );
  }

  async stop() {
    if (this._cronJob) {
      this._cronJob.stop();
    }
  }

  async revive() {
    this.logic.revive();
    await this.persist();
  }

  async trash() {
    this.logic.trash();
    await this.persist();
  }

  async error() {
    return this._error;
  }

  delete() {}
}

module.exports = {CronEntry, CronEntryLogic};
