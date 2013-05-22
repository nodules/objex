var util = require('util'),
    extend = require('extend'),
    builtinProps = {
        "function" : Object.getOwnPropertyNames(function(){}),
        "array" : Object.getOwnPropertyNames([])
    },
    typesWithBuiltinProps = Object.keys(builtinProps);

/**
 * @constructor
 */
function Objex() {}

/**
 * @typedef {Object} ObjexExtentionDescriptor
 * @property {String[]} include
 * @property {String[]} exclude
 * @property {Boolean} [override=false] allow overriding existing properties
 */

/**
 * @param {ObjexExtentionDescriptor|Array} extendStaticProps
 * @param {Function} base construtor
 * @param {Function} mixin constructor
 * @returns {Function} base
 */
function extendStaticProperties(extendStaticProps, base, mixin) {
    var staticProps = Object.getOwnPropertyNames(mixin),
        type = typeof mixin;

    Array.isArray(mixin) && (type = 'array');

    if (typesWithBuiltinProps.indexOf(type) > -1) {
        staticProps = staticProps.filter(function(propName) {
            return builtinProps[type].indexOf(propName) === -1;
        });
    }

    // normalize extendStaticProps format to ObjexExtentionDescriptor notation
    Array.isArray(extendStaticProps) && (extendStaticProps = { include : extendStaticProps });

    staticProps = staticProps.filter(function(propName) {
        return (extendStaticProps.override || typeof base[propName] === 'undefined') &&
            ! (extendStaticProps.exclude && extendStaticProps.exclude.indexOf(propName) > -1) &&
            ( ! extendStaticProps.include || extendStaticProps.include.indexOf(propName) > -1);
    });

    staticProps.forEach(function(propName) {
        var propDescriptor = Object.getOwnPropertyDescriptor(mixin, propName);

        // deep copy properties which type is array or object via extend()
        if (Array.isArray(propDescriptor.value)) {
            propDescriptor.value = extend(true, [], propDescriptor.value);
        } else if (typeof propDescriptor.value === 'object') {
            propDescriptor.value = extend(true, {}, propDescriptor.value);
        }

        Object.defineProperty(base, propName, propDescriptor);
    });
}

Object.defineProperty(Objex, '__objexPrepareInheritor', {
    value : function(Inheritor) {
        return Inheritor;
    },
    writable : true
});

/**
 * Setup inheritance between constructors passed as arguments and context constructor
 * @param {ObjexExtentionDescriptor|Boolean|Array} [extendStaticProps=true]
 * @param {Function} [Inheritor]
 * @returns {Function}
 * @example
 *      ```
 *      Inheritor = Super.create();
 *
 *      Inheritor = Super.create(false);
 *
 *      Inheritor = Super.create(function() {
 *          this.__super.apply(this, arguments);
 *          ...
 *      });
 *
 *      Inheritor = Super.create(['propOne', 'propTwo'], function() {
 *          this.__super.apply(this, arguments);
 *          ...
 *      });
 *
 *      Inheritor = Super.create({
 *              include: ['propOne', 'propTwo'],
 *              exclude: ['propN']
 *          },
 *          function() {
 *              this.__super.apply(this, arguments);
 *              ...
 *          });
 *      ```
 */
Objex.create = function(Inheritor) {
    var Super = this,
        extendStaticProps = true;

    if (typeof Inheritor === 'object' || Array.isArray(Inheritor) || typeof Inheritor === 'boolean') {
        extendStaticProps = arguments[0];
        Inheritor = arguments[1];
    }

    if (typeof Inheritor !== 'function') {
        Inheritor = this.__objexPrepareInheritor(function() {
            // return result if call constructor w/o `new` operator
            if ( ! (this instanceof Inheritor)) {
                return Super.apply(this, arguments)
            }

            Super.apply(this, arguments);
        });
    }

    util.inherits(Inheritor, Super);

    if ( ! extendStaticProps) {
        extendStaticProperties(['create', 'mixin', '__objexPrepareInheritor'], Inheritor, Super);
    } else {
        extendStaticProperties(extendStaticProps, Inheritor, Super);
    }

    Inheritor.__super = Super;

    return Inheritor;
};

/**
 * Add or override Objex inheritor prototype and static properties.
 * @param {ObjexExtentionDescriptor|Boolean|Array} [extendStaticProps=true]
 * @param {Function} mixin
 * @returns {Function} self
 */
Objex.mixin = function(mixin) {
    var Base = this,
        extendStaticProps = true;

    // keep Objex clean and virgin
    if (this === Objex) {
        throw new Error('Mixin to Objex constructor denied by design');
    }

    // optional extendStaticProps argument passed
    if (arguments.length > 1) {
        extendStaticProps = arguments[0];
        mixin = arguments[1];
    }

    // mixin prototype
    mixin.prototype && Object.getOwnPropertyNames(mixin.prototype).forEach(function(propName) {
        if (extendStaticProps.override || typeof Base.prototype[propName] === 'undefined') {
            Object.defineProperty(Base.prototype, propName, Object.getOwnPropertyDescriptor(mixin.prototype, propName));
        }
    });

    // mixin static fields
    extendStaticProps && extendStaticProperties(extendStaticProps, Base, mixin);

    return this;
};

/**
 * Use to create Objex-like base class which prototype chain different than the Objex > Object
 * @param {Function} Inheritor
 * @param {Function} [Super]
 * @returns {Function} Inheritor extended with `create` and `__super`
 */
Objex.wrap = function(Inheritor, Super) {
    extendStaticProperties(['create', 'mixin', '__objexPrepareInheritor'], Inheritor, Objex);

    if (typeof Super === 'function') {
        Inheritor.__super = Super;
    }

    return Inheritor;
};

module.exports = Objex;
