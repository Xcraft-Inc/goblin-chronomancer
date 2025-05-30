// @ts-check
const {hrtime} = require('node:process');
const {Elf} = require('xcraft-core-goblin');
const {
  string,
  object,
  enumeration,
  union,
  number,
} = require('xcraft-core-stones');
const {CronJob} = require('cron');

class MetaShape {
  status = enumeration('published', 'trashed');
}

class CronEntryShape {
  id = string;
  meta = MetaShape;
  time = union(string, number); /* cron time string or a unix timestamp */
  command = string;
  payload = object;
  loggingMode = enumeration('enabled', 'disabled');
}

class CronEntryState extends Elf.Sculpt(CronEntryShape) {}

class CronEntryLogic extends Elf.Archetype {
  static db = 'chronomancer';
  state = new CronEntryState({
    id: undefined,
    meta: {
      status: 'published',
    },
    time: undefined,
    command: undefined,
    payload: undefined,
    loggingMode: 'enabled',
  });

  create(id) {
    const {state} = this;
    state.id = id;
  }

  upsert(time, command, payload, loggingMode) {
    const {state} = this;
    state.time = time;
    state.command = command;
    state.payload = payload;
    state.loggingMode = loggingMode;
    state.meta.status = 'published';
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
  state = new CronEntryState();

  _cronJob;
  _error = null;
  _running = false;

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
   * @param {string|number} [time] cronTime
   * @param {string} [command] Xcraft command call
   * @param {object|undefined} [payload] data passed with the command
   * @param {CronEntryState["loggingMode"]} [loggingMode] override logging mode (by default enabled)
   */
  async upsert(time, command, payload, loggingMode = 'enabled') {
    this.logic.upsert(time, command, payload, loggingMode);
    await this.persist();
  }

  /** @private */
  async _job() {
    const {state} = this;

    if (this._running) {
      if (this.state.loggingMode === 'enabled') {
        this.log.dbg(
          `[chronomancer] job ${state.command} is already running, skip this tick`
        );
      }
      return;
    }

    const time = hrtime.bigint();
    try {
      this._running = true;
      if (this.state.loggingMode === 'enabled') {
        this.log.dbg(`[chronomancer] begin ${state.command}`);
      }
      await this.quest.cmd(state.command, state.payload?.toJS());
      this._error = null;
    } catch (ex) {
      this.quest.logCommandError(ex);
      this._error = ex;
    } finally {
      this._running = false;
      if (this.state.loggingMode === 'enabled') {
        const duration =
          Number(hrtime.bigint() / 1_000_000n - time / 1_000_000n) / 1000;

        this.log.dbg(`[chronomancer] end ${state.command} after ${duration}s`);
      }
    }
  }

  async start() {
    const {state} = this;

    if (this._cronJob) {
      if (this._cronJob.running) {
        return;
      }

      const isSameTime = state.time === this._cronJob.cronTime.source;
      if (isSameTime) {
        this._cronJob.start();
        return;
      }

      this._cronJob = null;
    }

    const time =
      typeof state.time === 'number' ? new Date(state.time) : state.time;

    try {
      this._cronJob = new CronJob(
        time,
        async () => await this._job(),
        null,
        true
      );
    } catch (ex) {
      if (ex.message.startsWith('WARNING')) {
        this.log.warn(state.id + ': ' + ex.stack || ex.message || ex);
      } else {
        throw ex;
      }
    }
  }

  async stop() {
    if (this._cronJob) {
      this._cronJob.stop();
    }
  }

  async fire() {
    if (this._cronJob) {
      this._cronJob.fireOnTick();
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

  async nextDates(count = 1) {
    return this._cronJob ? this._cronJob.nextDates(count) : [];
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

module.exports = {CronEntry, CronEntryShape, CronEntryLogic, CronEntryState};
