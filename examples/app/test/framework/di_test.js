/* eslint no-unused-expressions: 0 */
const Container = require('../../../../lib/di/container')

describe('di', function() {
  let container
  beforeEach(function() { container = new Container() })
  it('registers constant', function() {
    container.register('svc', '123')
    expect(container.get('svc')).to.eql('123')
  })

  describe('getDefinition', function() {
    it('returns the definition', function() {
      const definition = function() {}
      container.register('svc', definition)
      expect(container.getDefinition('svc')).to.eql(definition)
    })
  })

  describe('aliases', function() {
    it('supports aliases', function() {
      class Test {}
      container.register('svc', Test, { aliases: ['the_svc'] })
      let svc = container.get('svc')
      let theSvc = container.get('the_svc')
      expect(svc).to.not.eql(null)
      expect(theSvc).to.not.eql(null)
    })

    it('singleton aliases resolve to the same object', function() {
      class Test {}
      container.registerSingleton('svc', Test, { aliases: ['the_svc'] })
      let svc = container.get('svc')
      let theSvc = container.get('the_svc')
      expect(svc).to.equal(theSvc)
    })
  })

  it('registers class', function() {
    class Test {}
    container.register('svc', Test)
    expect(container.get('svc')).to.be.instanceOf(Test)
  })

  describe('functions', function() {
    it('registers pascal-case named functions as class', function() {
      function Test() { this.hello = function() {} }
      container.register('svc', Test)
      expect(container.get('svc').hello).to.not.eql(null)
    })

    it('resolves dependencies for constructor-functions', function() {
      container.register('a', 1)

      function Test(a) { this.foo = function() { return a } }
      container.register('svc', Test)

      expect(container.get('svc').foo()).to.equal(1)
    })

    it('registers functions as factory', function() {
      function test() { return 'hello' }
      container.register('svc', test)
      expect(container.get('svc')).to.eql('hello')
    })

    it('registers anonymous functions as factory', function() {
      container.register('svc', function() { return 123 })
      expect(container.get('svc')).to.eql(123)
    })
  })

  it('registers arrow functions', function() {
    container.register('svc', () => 123)
    expect(container.get('svc')).to.eql(123)
  })

  it('registers async functions', async function() {
    container.register('svc', async function() { return 123 })
    expect(await container.getAsync('svc')).to.eql(123)
  })

  it('registers async arrow functions', async function() {
    container.register('svc', async () => 1234)
    expect(await container.getAsync('svc')).to.eql(1234)
  })

  it('registers destructuring', function() {
    container.register('dep', { a: 3 })
    container.register('svc', ({ a } = dep) => a ** 3) /* eslint no-undef: 0 */
    expect(container.get('svc')).to.eql(27)
  })

  it('registers function as value', function() {
    let func = function() {}
    container.register('func', func, { type: 'object' })
    expect(container.get('func')).to.equal(func)
  })

  describe('initializable objects', function() {
    it('initializes objects', function() {
      container.register('a', class {
        initialize() {
          this.foo = 'bar'
        }
      })
      expect(container.get('a').foo).to.eql('bar')
    })

    it('supports async initialize', async function() {
      container.register('a', class {
        async initialize() {
          return Promise.delay(50).then(() => this.foo = 'bar')
        }
      })
      let svc = await container.getAsync('a')
      expect(svc.foo).to.eql('bar')
    })

    it('throws exception if `get` is called instead of `getAsync`', async function() {
      container.register('a', class {
        async initialize() {
          return Promise.delay(50).then(() => this.foo = 'bar')
        }
      })
      expect(() => container.get('a')).to.throw(Error, "use 'getAsync' instead")
    })
  })

  describe('get', function() {
    it('throws error if `name` can not be found', function() {
      expect(() => container.get('a')).to.throw(Error, "'a' can not be resolved")
    })

    it('does not throw if service not registered, but doNotThrow is true', function() {
      expect(container.get('missing_dep', { doNotThrow: true })).to.be.null
    })
  })

  describe('try', function() {
    it('returns dependency', function() {
      container.register('a', { a: 1 })
      expect(container.try('a')).to.eql({ a: 1 })
    })

    it('returns null if dependency not registered', function() {
      expect(container.try('missing_dep')).to.be.null
    })

    describe('async', function() {
      it('returns null if dependency not registered', async function() {
        expect(await container.tryAsync('missing_dep')).to.be.null
      })
    })
  })

  describe('dependencies resolution', function() {
    it('supports functions', function() {
      function test(a, b) { return a + b }
      container.register('svc', test)
      container.register('a', 1)
      container.register('b', 2)
      expect(container.get('svc')).to.eql(3)
    })

    it('supports classes', function() {
      class Test {
        constructor(a, b) { this.a = a; this.b = b }
        foo() { return this.a ** 2 + this.b ** 2 }
      }
      container.register('svc', Test)
      container.register('a', 1)
      container.register('b', 2)
      expect(container.get('svc').foo()).to.eql(5)
    })

    it('supports async dependencies', async function() {
      container.register('a', async function() { return 5 })
      container.register('svc', function(a) { return 2 * a })
      expect(await container.getAsync('svc')).to.eql(10)
    })
  })

  describe('create', function() {
    it('creates an instance', function() {
      class Test {}
      expect(container.create(Test)).to.be.instanceOf(Test)
    })

    it('resolves dependencies', function() {
      class Test { constructor(a) { this.a = a } }
      container.register('a', 1)
      let t = container.create(Test)
      expect(t.a).to.eql(1)
    })

    it('runs a function', function() {
      let called = false
      container.create(function() { called = true })
      expect(called).to.eql(true)
    })

    describe('ad-hoc dependencies', function() {
      it('injects ad-hoc dependencies', function() {
        function Foo(value) { this.calc = function() { return value * value } }
        let foo = container.create(Foo, { args: { value: 3 } })
        expect(foo.calc()).to.eql(9)
      })

      it('overrides registered services with ad-hocs', function() {
        container.register('a', 1)
        function f(a) { return a * a }
        expect(container.run(f, { args: { a: 3 } })).to.eql(9)
      })
    })
  })

  describe('run', function() {
    it('runs the function', function() {
      expect(container.run(() => 1)).to.eql(1)
    })

    it('resolves dependencies', function() {
      container.register('a', 3)
      expect(container.run((a) => 2 * a)).to.eql(6)
    })
  })

  describe('createNested', function() {
    let nested
    beforeEach(function() { nested = container.createNested() })
    it('creates a new container', function() {
      expect(nested).to.be.instanceOf(Container)
    })

    it('resolves dependencies from parent scope', function() {
      function f(a, b) { return a + b }
      container.register('a', 1)
      nested.register('b', 2)
      nested.register('svc', f)
      expect(nested.get('svc')).to.eql(3)
    })
  })

  describe('scopes', function() {
    describe('singleton', function() {
      it('creates only one instance', function() {
        class Test { constructor() { this.a = Math.random() } }
        container.registerSingleton('a', Test)
        expect(container.get('a')).to.equal(container.get('a'))
      })
    })

    describe('transient', function() {
      it('is default lifetime', function() {
        class Test { constructor() { this.a = Math.random() } }
        container.register('a', Test)
        expect(container.get('a')).to.not.equal(container.get('a'))
      })
    })
  })

  describe('namespaces', function() {
    it('registers services in namespaces', function() {
      container.register('something:a', 1)
      container.register('something:b', 2)
      expect(container.find(/some/)).to.eql(['something:a', 'something:b'])
    })

    it('returns services from parent container(s)', function() {
      container.register('something:a', 1)
      let nested = container.createNested()
      nested.register('something:b', 2)
      expect(nested.find(/some/)).to.eql(['something:b', 'something:a'], 'find should support regex')
      expect(nested.find('some')).to.eql(['something:b', 'something:a'], 'find should support strings')
    })

    it('being resolved by default value', function() {
      container.register('something:a', 1)
      let result = container.run((a = 'something:a') => a + 2)
      expect(result).to.eql(3)
    })

    it('throws if unable to figure out dependency name', function() {
      expect(function() {
        container.run(({ a } = { b }) => a + b)
      }).to.throw('Unable to figure out dependency name')
    })
  })
})
