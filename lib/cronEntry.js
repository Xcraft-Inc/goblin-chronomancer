// @ts-check
const {hrtime} = require('node:process');
const {promisify} = require('node:util');
const {Elf} = require('xcraft-core-goblin');
const {string, object, enumeration} = require('xcraft-core-stones');
const {CronJob} = require('cron');

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

  create(id) {
    const {state} = this;
    state.id = id;
  }

  upsert(time, command, payload) {
    const {state} = this;
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
   * @returns {Promise<this>} this
   */
  async create(id, desktopId) {
    this.logic.create(id);
    await this.persist();
    return this;
  }

  /**
   * @param {string} [time] cronTime
   * @param {string} [command] Xcraft command call
   * @param {object|undefined} [payload] data passed with the command
   */
  async upsert(time, command, payload) {
    this.logic.upsert(time, command, payload);
    await this.persist();
  }

  async start() {
    if (this._cronJob) {
      this._cronJob.start();
      return;
    }

    const resp = this.quest.newResponse('chronomancer', 'token');
    const send = promisify(resp.command.nestedSend).bind(resp.command);
    const {state} = this;
    this._cronJob = new CronJob(
      state.time,
      async () => {
        const time = hrtime.bigint();
        try {
          this.log.dbg(`[chronomancer] begin ${state.command}`);
          await send(state.command, state.payload);
          this._error = null;
        } catch (ex) {
          this.log.err(ex.stack || ex.message || ex);
          this._error = ex;
        } finally {
          const duration =
            Number(hrtime.bigint() / 1_000_000n - time / 1_000_000n) / 1000;
          this.log.dbg(`[chronomancer] end ${state.command} in ${duration}`);
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
    if (this._cronJob) {
      this._cronJob.stop();
    }
    this.logic.trash();
    await this.persist();

    this._cronJob = null;
    this._error = null;
  }

  async running() {
    if (this._cronJob) {
      return this._cronJob.running;
    }
    return false;
  }

  async error() {
    return this._error;
  }

  delete() {
    if (this._cronJob) {
      this._cronJob.stop();
    }
  }

  dispose() {
    if (this._cronJob) {
      this._cronJob.stop();
    }
  }
}

module.exports = {CronEntry, CronEntryLogic};
