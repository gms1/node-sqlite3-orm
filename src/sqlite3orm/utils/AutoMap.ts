


export class AutoMap<K, V> {
  private _mymap: Map<K, V>;
  get map(): Map<K, V> {
    return this._mymap;
  }

  constructor(
      private readonly name: string, private readonly typeName: string,
      private readonly construct: (key: K, ...args: any[]) => V) {
    this._mymap = new Map<K, V>();
  }

  has(key: K): V|undefined {
    return this._mymap.get(key);
  }

  get(key: K): V {
    const val: V|undefined = this._mymap.get(key);
    if (!val) {
      throw new Error(`${this.typeName} '${key}' not found in ${this.name}`);
    }
    return val;
  }

  getAlways(key: K, ...args: any[]): V {
    let val: V|undefined = this._mymap.get(key);
    if (!val) {
      val = this.construct(key, ...args);
      this._mymap.set(key, val);
    }
    return val;
  }

  set(key: K, val: V): void {
    this._mymap.set(key, val);
  }
}
