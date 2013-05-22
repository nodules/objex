# objex

Base constructor to ease prototype inheritance.

[Skip to API](#api).

### Simple example

```javascript
var Objex = require('objex'),

    Animal = Objex.create(function() {
        Animal.__super.apply(this, arguments);
        this.feet = 4;
        this.hands = 0;
        this.head = 1;
    }),

    Wolf = Animal.create(),

    Dog = Wolf.create(),

    Monkey = Animal.create(function() {
        Monkey.__super.apply(this, arguments);

        this.feet = 2;
        this.hands = 2;
    }),

    wolf = new Wolf(),
    dog = new Dog(),
    monkey = new Monkey();

// check inheritance
console.log('wolf is instance of Wolf', wolf instanceof Wolf);
console.log('wolf is instance of Animal', wolf instanceof Animal);

console.log('monkey is instance of Monkey', monkey instanceof Monkey);
console.log('monkey is instance of Animal', monkey instanceof Animal);

console.log('dog is instance of Dog', dog instanceof Dog);
console.log('dog is instance of Wolf', dog instanceof Wolf);
console.log('dog is instance of Animal', dog instanceof Animal);
```

### Don't copy / partially copy static properties of super-class

```javascript
var Animal = Objex.create(function() {
        Animal.__super.apply(this, arguments);
        Animal.count++;
    }),
    Sheep,
    Wolf;
    
Animal.count = 0;

Animal.kill = function() {
    if (Animal.count > 0) {
        Animal.count--;
    }
};
    
// pass `false` as first argument to prevent static fields bypass,
// static method `create` will be copied anyway.
// Assume, you want to count sheeps separately.
// Animal.count will not be copied to Sheep.count, because it useless here.
// Animal.kill will not be copied to Sheep too, aren't you want to shoot your own Sheep?
Sheep = Animal.create(false, function() {
    Sheep.count++;
});

Sheep.count = 0;

// pass array of property names as first argument 
// to copy certain static properties only.
// Static property `count` is useless for Wolf,
// but you are still able to kill it, and decrease global Animal.count!
Wolf = Animal.create(['kill'], function() {
    Wolf.__super.apply(this, arguments);
    this.hungry = false;
});
```

### Set base constructor which differs from the Object

Suppose, you need to create Error inheritor, so your prototype chain must look like `ErrorEx > Error > Object`, not `ErrorEx > Object`.

`Objex.wrap` at your service!

```javascript
var MyOwnErrorEx;

function ErrorEx() {
    ErrorEx.__super.apply(this, arguments);
    
    this.extended = true;
}

util.inherits(ErrorEx, Error);
Objex.wrap(ErrorEx, Error);
// now ErrorEx has `create` method and `__super` property

MyOwnErrorEx = ErrorEx.create(function(code) {
    this.code = code;
    MyOwnErrorEx.__super.apply(this, Array.prototype.slice.call(arguments, 1));
});
```

### Mixin

Mixin (copy) static and prototype properties from any constructor to the Objex successor, without prototype chain modification. Mixed properties will be own properties of a target object.

```javascript
var Animal = Objex.create(),
    Dog = Animal.create(),
    TrickyPet = function() {}, // mixin ctor
    LoudVoice = function() {}, // more one
    jimmy = new Dog();

Animal.prototype.say = function(wat) {
    console.log(wat);
}

// mixin method
TrickyPet.prototype.jumpBackward = function() {
    this.say('Woo-oo!');
};

// copy TrickyPet.prototype methods to Dog.prototype
Dog.mixin(TrickyPet);

// call copied method from the instance of Dog
jimmy.jumpBackward();

// mixin method
LoudVoice.prototype.say = function(wat) {
    console.log('(loud voice)', wat);
};

// override existing Dog prototype's method `say`
Dog.mixin({ override : true }, LoudVoice);

jimmy.jumpBackward();
```

## API

Description of the Objex and its successors static methods.

### create([options], ctor)

Create successor of the callee with constructor passed as `ctor` argument. Argument `options` describes how the successor inherits statis fields:

* `true` – default value; copy all static properties w/o existing properties overriding;
* `false` – don't copy statis properties;
* `{ include : [], exclude : [] }` – object with optional fields `include` and `exclude` which are arrays of properties' names to copy of not;
* `Array of String` – shotcut syntax for `{ include : [] }`.

### wrap(ctor)

Add Objex `create` and `mixin` static methods to the `ctor` which is not Objex successor without prototype chain modification.

### mixin([options], ctor)

Mixin (copy) static and prototype methods of `ctor` to the callee contructor and its prototype if they doesn't exists.

Argument `options` is mostly the same as of the `create` method, but the object argument can contain additional boolean property `override`. If it equals `true` existing methods of the callee will be overriden by mixin's methods.
