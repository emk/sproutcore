// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var SC = require('core');

/**
  @namespace
  
  Impelements some standard methods for copying an object.  Add this mixin to
  any object you create that can create a copy of itself.  This mixin is 
  added automatically to the built-in array.
  
  You should generally implement the copy() method to return a copy of the 
  receiver.
  
  Note that frozenCopy() will only work if you also implement SC.Freezable.

  @since SproutCore 1.0
*/
SC.Copyable = {
  
  /**
    Walk like a duck.  Indicates that the object can be copied.
    
    @type Boolean
  */
  isCopyable: true,
  
  /**
    Override to return a copy of the receiver.  Default implementation raises
    an exception.
    
    @returns {Object} copy of receiver
  */
  copy: function() {
    throw "%@.copy() is not implemented";
  },
  
  /**
    If the object implements SC.Freezable, then this will return a new copy 
    if the object is not frozen and the receiver if the object is frozen.  
    
    Raises an exception if you try to call this method on a object that does
    not support freezing.
    
    You should use this method whenever you want a copy of a freezable object
    since a freezable object can simply return itself without actually 
    consuming more memory.
  
    @returns {Object} copy of receiver or receiver
  */
  frozenCopy: function() {
    var isFrozen = this.get ? this.get('isFrozen') : this.isFrozen;
    if (isFrozen === true) return this;
    else if (isFrozen === undefined) throw "%@ does not support freezing".fmt(this);
    else return this.copy().freeze();
  }
};

// Make Array copyable
SC.mixin(Array.prototype, SC.Copyable);
Array.prototype.copy = Array.prototype.slice;
