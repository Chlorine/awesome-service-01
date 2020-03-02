export type HRTime = [number, number];

export class ElapsedTime {
  _startAt: HRTime = [0, 0];

  constructor() {
    this._startAt = process.hrtime();
  }

  getDiff(hrTimeBefore?: HRTime): number {
    const diff: HRTime = process.hrtime(hrTimeBefore ? hrTimeBefore : this._startAt);

    return diff[0] * 1e3 + diff[1] * 1e-6;
  }

  reset() {
    this._startAt = process.hrtime();
  }

  getDiffStr(hrTimeBefore?: HRTime) {
    return this.getDiff(hrTimeBefore).toFixed(2) + ' ms';
  }
}
