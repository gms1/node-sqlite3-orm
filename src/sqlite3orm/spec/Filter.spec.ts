import {FilterBuilder} from '../Filter';

interface TestModel {
  id: number;
  name: string;
  active: boolean;
  birthday: Date;
  stars: number;
}


describe('test FilterBuilder', () => {
  it('build filter: where', () => {
    const fb = new FilterBuilder<TestModel>();
    fb.where.eq('id', 1).isLike('name', 'G%');
    const filter = fb.filter;
    expect(filter).toEqual({
      where: {
        and: true,
        conditions: [{property: 'id', condition: {eq: 1}}, {property: 'name', condition: {isLike: 'G%'}}]
      }
    });
    fb.init();
    expect(fb.filter).toEqual({});
  });

  it('build filter: columns', () => {
    const fb = new FilterBuilder<TestModel>();
    fb.columns.add('id').add(['active', 'stars']);
    const filter = fb.filter;
    expect(filter).toEqual({columns: ['id', 'active', 'stars']});
  });

  it('build filter: order asc', () => {
    const fb = new FilterBuilder<TestModel>();
    fb.order.add('id').add(['active', 'stars']);
    const filter = fb.filter;
    expect(filter).toEqual({order: [{property: 'id'}, {property: 'active'}, {property: 'stars'}]});
  });

  it('build filter: order desc', () => {
    const fb = new FilterBuilder<TestModel>();
    fb.order.add('id', true).add(['active', 'stars'], true);
    const filter = fb.filter;
    expect(filter).toEqual(
        {order: [{property: 'id', desc: true}, {property: 'active', desc: true}, {property: 'stars', desc: true}]});
  });


  it('build filter: limit', () => {
    const fb = new FilterBuilder<TestModel>();
    fb.limit = 5;
    fb.offset = 1;
    const filter = fb.filter;
    expect(filter).toEqual({limit: 5, offset: 1});
  });

});
