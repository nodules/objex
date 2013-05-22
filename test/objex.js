var Objex = require('../lib/objex'),
    util = require('util');

module.exports = {
    create : function create(test) {
        var Animal = Objex.create(function Animal() {
                Animal.__super.apply(this, arguments);
                this.animal = true;
            }),
            Wolf = Animal.create(function Wolf() {
                Wolf.__super.apply(this, arguments);
                this.wolf = true;
            }),
            Dog = Wolf.create(function Dog() {
                Dog.__super.apply(this, arguments);
                this.dog = true;
            }),
            Bird = function Bird() {
                Bird.__super.apply(this, arguments);
                this.bird = true;
            },
            Eagle,
            animal = new Animal(),
            wolf = new Wolf(),
            dog = new Dog(),
            bird,
            eagle;

        test.throws(function() {
            bird = new Bird();
        }, TypeError, 'call constructor with __super call before Objex.create');

        Bird = Animal.create(Bird);
        bird = new Bird();

        Eagle = Bird.create();
        eagle = Object.create(Eagle.prototype);
        Eagle.apply(eagle);

        test.ok(animal instanceof Animal, 'instanceof check #1');

        test.ok(wolf instanceof Animal, 'instanceof check #2');
        test.ok(wolf instanceof Wolf, 'instanceof check #3');

        test.ok(dog instanceof Animal, 'instanceof check #4');
        test.ok(dog instanceof Wolf, 'instanceof check #5');
        test.ok(dog instanceof Dog, 'instanceof check #6');

        test.ok(bird instanceof Animal, 'instanceof check #7');
        test.ok(bird instanceof Bird, 'instanceof check #8');
        test.ok( ! (bird instanceof Wolf), 'instanceof check #9');

        test.ok(eagle instanceof Animal, 'instanceof check #10');
        test.ok(eagle instanceof Bird, 'instanceof check #11');
        test.ok(eagle instanceof Eagle, 'instanceof check #12');

        test.ok(animal.animal, 'contructed properties check #1');
        test.ok( ! animal.wolf, 'contructed properties check #2');
        test.ok( ! animal.bird, 'contructed properties check #3');

        test.ok(wolf.animal, 'contructed properties check #4');
        test.ok(wolf.wolf, 'contructed properties check #5');

        test.ok(dog.animal, 'contructed properties check #6');
        test.ok(dog.wolf, 'contructed properties check #7');
        test.ok(dog.dog, 'contructed properties check #8');
        test.ok( ! dog.bird, 'contructed properties check #9');

        test.ok(eagle.animal, 'contructed properties check #10');
        test.ok(eagle.bird, 'contructed properties check #11');
        test.ok( ! eagle.eagle, 'contructed properties check #12');
        test.ok( ! eagle.wolf, 'contructed properties check #13');
        test.ok( ! eagle.dog, 'contructed properties check #14');

        test.ok(Object.prototype.isPrototypeOf(dog), 'prototype chain check #1');
        test.ok(Objex.prototype.isPrototypeOf(dog), 'prototype chain check #2');
        test.ok(Animal.prototype.isPrototypeOf(dog), 'prototype chain check #3');
        test.ok(Wolf.prototype.isPrototypeOf(dog), 'prototype chain check #4');
        test.ok(Dog.prototype.isPrototypeOf(dog), 'prototype chain check #5');

        test.ok(Object.prototype.isPrototypeOf(eagle), 'prototype chain check #6');
        test.ok(Objex.prototype.isPrototypeOf(eagle), 'prototype chain check #7');
        test.ok(Animal.prototype.isPrototypeOf(eagle), 'prototype chain check #8');
        test.ok(Bird.prototype.isPrototypeOf(eagle), 'prototype chain check #9');
        test.ok(Eagle.prototype.isPrototypeOf(eagle), 'prototype chain check #10');

        test.done();
    },

    mixin : function mixin(test) {
        var Wolf = Objex.create(),
            Werewolf = Wolf.create(),
            Human = Objex.create(),
            Invader = Objex.create(),
            werewolf,
            wwPopulation = 10000,
            humanPopulation = 6000000000,
            humanObj = { x : 1 },
            humanArr = [ 1, 2 , humanObj ],
            wwObj = { x : 2, y : 2 },
            wwArr = [ 2, 3, wwObj ],
            cowsGetter = function() {
                return 0;
            };

        function NoPrototypeCtor() {}
        NoPrototypeCtor.prototype = undefined;

        Human.prototype.obj = humanObj;
        Human.prototype.arr = humanArr;
        Human.population = humanPopulation;
        Human.obj = humanObj;
        Human.arr = humanArr;

        Invader.fromMars = true;
        Object.defineProperty(Invader, 'collectedCowsTotal', { get : cowsGetter });

        Werewolf.population = wwPopulation;
        Werewolf.obj = wwObj;
        Werewolf._arr = wwArr;
        Werewolf.prototype._obj = wwObj;
        Werewolf.prototype.arr= wwArr;

        Werewolf.mixin(Human);

        test.strictEqual(Werewolf.population, wwPopulation, 'do not override static props by default #1');
        test.strictEqual(Werewolf.obj, wwObj, 'do not override static props by default #2');

        test.strictEqual(Werewolf._arr, wwArr, 'keep not existing in mixin static props');
        test.strictEqual(Werewolf.prototype.arr, wwArr, 'do not override prototype props by default');
        test.strictEqual(Werewolf.prototype._obj, wwObj, 'keep not existing in mixin prototype props');

        test.strictEqual(Werewolf.prototype.obj, Human.prototype.obj, 'extend prototype with links');
        test.notStrictEqual(Werewolf.arr, Human.arr, 'static prop extend using deep copy #1');
        test.deepEqual(Werewolf.arr, Human.arr, 'static prop extend using deep copy #2');

        Werewolf.mixin({ exclude : ['fromMars'] }, Invader);

        test.strictEqual(typeof Werewolf.fromMars, 'undefined', 'excluded static prop not copied to target');
        test.strictEqual(Object.getOwnPropertyDescriptor(Werewolf, 'collectedCowsTotal').get, cowsGetter, 'static getter copied to target');

        werewolf = new Werewolf();

        test.ok(werewolf instanceof Werewolf, 'inheritance check #1');
        test.ok(werewolf instanceof Wolf, 'inheritance check #2');
        test.ok( ! (werewolf instanceof Human), 'inheritance check #3');
        test.ok( ! Human.prototype.isPrototypeOf(werewolf), 'inheritance check #4');

        test.doesNotThrow(function() {
            Werewolf.mixin(NoPrototypeCtor);
        }, TypeError, 'mixin contructor or object without prototype');

        test.done();
    },

    wrap : function wrap(test) {
        var ErrorInheritor = function() {
                ErrorInheritor.__super.apply(this, arguments);
            },
            ErrorInheritor2,
            err;

        util.inherits(ErrorInheritor, Error);
        Objex.wrap(ErrorInheritor, Error);

        test.ok(ErrorInheritor.create === Objex.create, 'check static Objex.create mixin');

        ErrorInheritor2 = ErrorInheritor.create();

        err = new ErrorInheritor();

        test.ok(err instanceof ErrorInheritor, 'instanceof check #1');
        test.ok(err instanceof Error, 'instanceof check #2');
        test.ok(err instanceof Object, 'instanceof check #3');

        test.ok(Error.prototype.isPrototypeOf(err), 'check prototype chain #1');
        test.ok(Object.prototype.isPrototypeOf(err), 'check prototype chain #2');

        test.ok(ErrorInheritor.prototype.isPrototypeOf(err), 'check prototype chain #3');
        test.ok(Error.prototype.isPrototypeOf(err), 'check prototype chain #4');
        test.ok(Object.prototype.isPrototypeOf(err), 'check prototype chain #5');

        test.done();
    }
};
