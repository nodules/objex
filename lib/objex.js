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
 * @param {*} descriptor
 * @returns {ObjexExtentionDescriptor}
 */
function normalizeExtensionDescriptor(descriptor) {
    if (typeof descriptor === 'object') {
        if (Array.isArray(descriptor)) {
            return { include: descriptor };
        } else {
            return descriptor;
        }
    } else {
        return {};
    }
}

/**
 * @param {ObjexExtentionDescriptor|Array|Boolean} extendStaticProps
 * @param {Function} base construtor
 * @param {Function} mixin constructor
 * @returns {Function} base
 */
function extendStaticProperties(extendStaticProps, base, mixin) {
    var staticProps = Object.getOwnPropertyNames(mixin),
        type = Array.isArray(mixin) ? 'array' : typeof mixin;

    if (typesWithBuiltinProps.indexOf(type) > -1) {
        staticProps = staticProps.filter(function(propName) {
            return builtinProps[type].indexOf(propName) === -1;
        });
    }

    extendStaticProps = normalizeExtensionDescriptor(extendStaticProps);

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
        } else if (typeof propDescriptor.value === 'object' && propDescriptor.value !== null) {
            propDescriptor.value = extend(true, {}, propDescriptor.value);
        }

        Object.defineProperty(base, propName, propDescriptor);
    });
}

/**
 * @param {Objex|Object} Super
 * @param {Objex|Object} Inheritor
 * @returns {Boolean}
 */
function isInheritor(Super, Inheritor) {
    while (Inheritor) {
        if (Inheritor === Super) {
            return true;
        }

        Inheritor = Inheritor.__super;
    }

    return false;
}

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
        extendStaticProps = true,
        type = typeof Inheritor;

    if (type !== 'function' && type !== 'undefined') {
        extendStaticProps = arguments[0];
        Inheritor = arguments[1];
    }

    if (typeof Inheritor !== 'function') {
        Inheritor = function() {
            // return result if call constructor w/o `new` operator
            if ( ! (this instanceof Inheritor)) {
                return Super.apply(this, arguments);
            }

            Super.apply(this, arguments);
        };
    }

    util.inherits(Inheritor, Super);

    if ( ! extendStaticProps) {
        extendStaticProperties(['create', 'mixin'], Inheritor, Super);
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
 * @param {*} mixinArgs... arguments to pass to mixin.__objexOnMixing function
 * @returns {Function} self
 */
Objex.mixin = function(mixin) {
    var Base = this,
        extendStaticProps = true,
        mixinArgs,
        mixinArgsOffset = 1;

    // keep Objex clean and virgin
    if (this === Objex) {
        throw new Error('Mixin to Objex constructor denied by design');
    }

    // optional extendStaticProps argument passed
    if (typeof arguments[0] !== 'function') {
        extendStaticProps = arguments[0];
        mixin = arguments[1];
        mixinArgsOffset = 2;
    }

    // mixin prototype
    mixin.prototype && Object.getOwnPropertyNames(mixin.prototype).forEach(function(propName) {
        if (propName !== 'constructor' && extendStaticProps.override || typeof Base.prototype[propName] === 'undefined') {
            Object.defineProperty(Base.prototype, propName, Object.getOwnPropertyDescriptor(mixin.prototype, propName));
        }
    });

    // mixin static fields
    if (extendStaticProps) {
        extendStaticProperties(extendStaticProps, Base, mixin);
    }

    // dynamic mixing
    if (typeof mixin.__objexOnMixing === 'function') {
        mixinArgs = Array.prototype.slice.call(arguments, mixinArgsOffset);
        mixinArgs.unshift(Base);

        // mixin.__objexOnMixing = function(BaseCtor, arg1, ...) { ... }
        mixin.__objexOnMixing.apply(mixin, mixinArgs);
    }

    return this;
};

/**
 * Use to create Objex-like base class which prototype chain different than the Objex > Object
 * @param {Function} Inheritor
 * @param {Function} [Super]
 * @returns {Function} Inheritor extended with `create`, `mixin` and `__super`
 */
Objex.wrap = function(Inheritor, Super) {
    extendStaticProperties(['create', 'mixin'], Inheritor, Objex);

    if (typeof Super === 'function') {
        Inheritor.__super = Super;
    }

    return Inheritor;
};

/**
 * Check if the Inheritor is inheritor of Class
 * @param {Object} Inheritor
 * @returns {Boolean}
 */
Objex.isParentOf = function(Inheritor) {
    return isInheritor(this, Inheritor);
};

/**
 * Check if the Super is parent of Class
 * @param {Object} Super
 * @returns {Boolean}
 */
Objex.isInheritorOf = function(Super) {
    return isInheritor(Super, this);
};

module.exports = Objex;
