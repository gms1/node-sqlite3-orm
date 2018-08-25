import {WhereBuilder} from '../Where';

interface TestModel {
  id: number;
  name: string;
  active: boolean;
  birthday: Date;
  stars: number;
}


describe('test WhereBuilder', () => {

  it('build where', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.eq('id', 1).isLike('name', 'G%').where;
    expect(where).toEqual(
        {and: true, conditions: [{property: 'id', condition: {eq: 1}}, {property: 'name', condition: {isLike: 'G%'}}]});
  });


  it('build where with multiple nested \'or\'', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.beginOr().eq('active', false).end().beginOr().eq('active', true).end().where;
    expect(where).toEqual({
      and: true,
      conditions: [
        {or: true, conditions: [{property: 'active', condition: {eq: false}}]},
        {or: true, conditions: [{property: 'active', condition: {eq: true}}]}
      ]
    });
  });

  it('build where with \'and\' and multiple nested \'or\'', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.beginAnd().beginOr().eq('active', false).end().beginOr().eq('active', true).end().end().where;
    expect(where).toEqual({
      and: true,
      conditions: [
        {or: true, conditions: [{property: 'active', condition: {eq: false}}]},
        {or: true, conditions: [{property: 'active', condition: {eq: true}}]}
      ]
    });
  });


  it('build where with \'or\' and multiple nested \'and\'', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.beginOr().beginAnd().eq('active', false).end().beginAnd().eq('active', true).end().end().where;
    expect(where).toEqual({
      or: true,
      conditions: [
        {and: true, conditions: [{property: 'active', condition: {eq: false}}]},
        {and: true, conditions: [{property: 'active', condition: {eq: true}}]}
      ]
    });
  });

  it('build where with \'or\' and multiple nested \'and\' with missing end()', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.beginOr().beginAnd().eq('active', false).end().beginAnd().eq('active', true).where;
    expect(where).toEqual({
      or: true,
      conditions: [
        {and: true, conditions: [{property: 'active', condition: {eq: false}}]},
        {and: true, conditions: [{property: 'active', condition: {eq: true}}]}
      ]
    });
  });

  it('build where with \'not-and\' and multiple nested \'or\'', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.beginNotAnd().beginOr().eq('active', false).end().beginOr().eq('active', true).end().end().where;
    expect(where).toEqual({
      not: true,
      and: true,
      conditions: [
        {or: true, conditions: [{property: 'active', condition: {eq: false}}]},
        {or: true, conditions: [{property: 'active', condition: {eq: true}}]}
      ]
    });
  });

  it('build where with \'not-or\' and multiple nested \'and\'', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.beginNotOr().beginAnd().eq('active', false).end().beginAnd().eq('active', true).end().end().where;
    expect(where).toEqual({
      not: true,
      or: true,
      conditions: [
        {and: true, conditions: [{property: 'active', condition: {eq: false}}]},
        {and: true, conditions: [{property: 'active', condition: {eq: true}}]}
      ]
    });
  });

  it('not build where with too much \'end\'', () => {
    const wb = new WhereBuilder<TestModel>();
    try {
      const where = wb.beginAnd().eq('active', false).end().end().where;
      fail('should have thrown');
    } catch (e) {
    }
  });


  it('build and move where', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.eq('id', 1).isLike('name', 'G%').move();
    const where2 = wb.where;
    expect(where).toEqual(
        {and: true, conditions: [{property: 'id', condition: {eq: 1}}, {property: 'name', condition: {isLike: 'G%'}}]});
    expect(where2).toEqual(undefined);
  });

  it('build where having \'eq\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.eq('stars', 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {eq: 42}}]});
  });

  it('build where having \'neq\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.neq('stars', 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {neq: 42}}]});
  });


  it('build where having \'gt\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.gt('stars', 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {gt: 42}}]});
  });

  it('build where having \'gte\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.gte('stars', 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {gte: 42}}]});
  });

  it('build where having \'lt\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.lt('stars', 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {lt: 42}}]});
  });

  it('build where having \'lte\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.lte('stars', 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {lte: 42}}]});
  });

  it('build where having \'isIn\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.isIn('stars', [42, 24]).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {isIn: [42, 24]}}]});
  });

  it('build where having \'notIn\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.notIn('stars', [42, 24]).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {notIn: [42, 24]}}]});
  });

  it('build where having \'isBetween\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.isBetween('stars', 24, 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {isBetween: [24, 42]}}]});
  });

  it('build where having \'notBetween\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.notBetween('stars', 24, 42).where;
    expect(where).toEqual({and: true, conditions: [{property: 'stars', condition: {notBetween: [24, 42]}}]});
  });

  it('build where having \'isLike\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.isLike('name', 'G%').where;
    expect(where).toEqual({and: true, conditions: [{property: 'name', condition: {isLike: 'G%'}}]});
  });

  it('build where having \'notLike\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.notLike('name', 'G%').where;
    expect(where).toEqual({and: true, conditions: [{property: 'name', condition: {notLike: 'G%'}}]});
  });

  it('build where having \'exists\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.exists('name').where;
    expect(where).toEqual({and: true, conditions: [{property: 'name', condition: {exists: true}}]});
  });

  it('build where having \'notExists\' predicate', () => {
    const wb = new WhereBuilder<TestModel>();
    const where = wb.notExists('name').where;
    expect(where).toEqual({and: true, conditions: [{property: 'name', condition: {notExists: true}}]});
  });



});
