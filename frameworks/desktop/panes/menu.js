// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
require('panes/picker');
require('views/menu_item');


/** 
  Default heights for menu items.
*/
if (!SC.DEFAULT_MENU_ITEM_HEIGHT)           SC.DEFAULT_MENU_ITEM_HEIGHT           = 20;
if (!SC.DEFAULT_MENU_ITEM_SEPARATOR_HEIGHT) SC.DEFAULT_MENU_ITEM_SEPARATOR_HEIGHT = 9;


/**
  @class

  SC.MenuPane allows you to display a standard menu. Menus appear over other
  panes, and block input to other views until a selection is made or the pane
  is dismissed by clicking outside of its bounds.

  You can create a menu pane and manage it yourself, or you can use the
  SC.SelectButtonView and SC.PopupButtonView controls to manage the menu for
  you.

  h2. Specifying Menu Items

  The menu pane examines the @items@ property to determine what menu items
  should be presented to the user.

  In its most simple form, you can provide an array of strings. Every item
  will be converted into a menu item whose title is the string.

  If you need more control over the menu items, such as specifying a keyboard
  shortcut, enabled state, custom height, or submenu, you can provide an array
  of content objects.

  Out of the box, the menu pane has some default keys it uses to get
  information from the objects. For example, to find out the title of the menu
  item, the menu pane will ask your object for its @title@ property. If you
  need to change this key, you can set the @itemTitleKey@ property on the pane
  itself.

  {{{
    var menuItems = [
      { title: 'Menu Item', keyEquivalent: 'ctrl_shift_n' },
      { title: 'Checked Menu Item', isChecked: YES, keyEquivalent: 'ctrl_a' },
      { title: 'Selected Menu Item', keyEquivalent: 'backspace' },
      { isSeparator: YES },
      { title: 'Menu Item with Icon', icon: 'inbox', keyEquivalent: 'ctrl_m' },
      { title: 'Menu Item with Icon', icon: 'folder', keyEquivalent: 'ctrl_p' }
    ];

    var menu = SC.MenuPane.create({
      items: menuItems
    });
  }}}

  h2. Observing User Selections

  To determine when a user clicks on a menu item, you can observe the
  @selectedItem@ property for changes.

  @extends SC.PickerPane
  @since SproutCore 1.0
*/
SC.MenuPane = SC.PickerPane.extend(
/** @scope SC.MenuPane.prototype */ {

  classNames: ['sc-menu'],

  // ..........................................................
  // PROPERTIES
  //

  /**
    The array of items to display. This can be a simple array of strings,
    objects or hashes. If you pass objects or hashes, you can also set the
    various itemKey properties to tell the menu how to extract the information
    it needs.

    @type String
  */
  items: [],

  /**
    The default height for each menu item, in pixels.

    You can override this on a per-item basis by setting the (by default) @height@ property on your object.

    @type Number
    @default SC.DEFAULT_MENU_ITEM_HEIGHT
  */
  itemHeight: SC.DEFAULT_MENU_ITEM_HEIGHT,

  /**
    The default height for separator menu items.

    You can override this on a per-item basis by setting the (by default)
    @height@ property on your object.

    @type Number
    @default SC.DEFAULT_MENU_ITEM_SEPARATOR_HEIGHT
  */
  itemSeparatorHeight: SC.DEFAULT_MENU_ITEM_SEPARATOR_HEIGHT,

  /**
    The height of the menu pane.  This is updated every time menuItemViews
    is recalculated.

    @type Number
    @isReadOnly
  */
  menuHeight: 0,

  /**
    The amount of padding to add to the height of the pane.

    The first menu item is offset by half this amount, and the other half is
    added to the height of the menu, such that a space between the top and the
    bottom is created.

    @type Number
    @default 0
  */
  menuHeightPadding: 0,

  /**
    The last menu item to be selected by the user.

    You can place an observer on this property to be notified when the user
    makes a selection.

    @type SC.Object
    @default null
    @isReadOnly
  */
  selectedItem: null,

  /**
    The view class to use when creating new menu item views.

    The menu pane will automatically create an instance of the view class you
    set here for each item in the @items@ array. You may provide your own
    subclass for this property to display the customized content.

    @default SC.MenuItemView
    @type SC.View
  */
  exampleView: SC.MenuItemView,

  /**
    The view or element to which the menu will anchor itself.

    When the menu pane is shown, it will remain anchored to the view you
    specify, even if the window is resized. You should specify the anchor as a
    parameter when calling @popup()@, rather than setting it directly.

    @type SC.View
    @isReadOnly
  */
  anchor: null,

  /**
    YES if this menu pane was generated by a parent SC.MenuPane.

    @type Boolean
    @isReadOnly
  */
  isSubMenu: NO,

  /**
    Whether the title of menu items should be localized before display.

    @type Boolean
    @default YES
  */
  localize: YES,

  // ..........................................................
  // METHODS
  //

  /**
    Makes the menu visible and adds it to the HTML document.

    If you provide a view or element as the first parameter, the menu will
    anchor itself to the view, and intelligently reposition itself if the
    contents of the menu exceed the available space.

    @param SC.View anchorViewOrElement the view or element to which the menu
    should anchor.
    @param preferMatrix The prefer matrix used to position the pane.
    (optional)
  */
  popup: function(anchorViewOrElement, preferMatrix) {
    var anchor;

    if (anchorViewOrElement) {
      anchor = anchorViewOrElement.isView ? anchorViewOrElement.get('layer') : anchorViewOrElement;
    }

    this.beginPropertyChanges();
    this.set('anchorElement',anchor) ;
    this.set('anchor',anchorViewOrElement);
    this.set('preferType',SC.PICKER_MENU) ;
    if (preferMatrix) this.set('preferMatrix',preferMatrix) ;

    this.endPropertyChanges();
    this.adjust('height', this.get('menuHeight'));
    this.positionPane();

    // Because panes themselves do not receive key events, we need to set the
    // pane's defaultResponder to itself. This way key events can be
    // interpreted in keyUp.
    this.set('defaultResponder', this);
    this.append();
  },

  /**
    Removes the menu from the screen.

    @returns {SC.MenuPane} receiver
  */
  remove: function() {
    this.set('currentMenuItem', null);
    this.closeOpenMenus();
    this.resignKeyPane();
    return sc_super();
  },

  // ..........................................................
  // ITEM KEYS
  //

  /**
    The name of the property that contains the title for each item.

    @type String
    @default "title"
    @commonTask Menu Item Properties
  */
  itemTitleKey: 'title',

  /**
    The name of the property that determines whether the item is enabled.

    @type String
    @default "isEnabled"
    @commonTask Menu Item Properties
  */
  itemIsEnabledKey: 'isEnabled',

  /**
    The name of the property that contains the value for each item.

    @type String
    @default "value"
    @commonTask Menu Item Properties
  */
  itemValueKey: 'value',

  /**
    The name of the property that contains the icon for each item.

    @type String
    @default "icon"
    @commonTask Menu Item Properties
  */
  itemIconKey: 'icon',

  /**
    The name of the property that contains the height for each item.

    @readOnly
    @type String
    @default "height"
    @commonTask Menu Item Properties
  */
  itemHeightKey: 'height',

  /**
    The name of the property that contains an optional submenu for each item.

    @type String
    @default "subMenu"
    @commonTask Menu Item Properties
  */
  itemSubMenuKey: 'subMenu',

  /**
    The name of the property that determines whether the item is a menu
    separator.

    @type String
    @default "separator"
    @commonTask Menu Item Properties
  */
  itemSeparatorKey: 'separator',

  /**
    The name of the property that contains the target for the action that is triggered when the user clicks the menu item.

    Note that this property is ignored if the menu item has a submenu.

    @type String
    @default "target"
    @commonTask Menu Item Properties
  */
  itemTargetKey: 'target',

  /**
    The name of the property that contains the action that is triggered when
    the user clicks the menu item.

    Note that this property is ignored if the menu item has a submenu.

    @type String
    @default "action"
    @commonTask Menu Item Properties
  */
  itemActionKey: 'action',

  /**
    The name of the property that determines whether the menu item should
    display a checkbox.

    @type String
    @default "checkbox"
    @commonTask Menu Item Properties
  */
  itemCheckboxKey: 'checkbox',

  /**
    The name of the property that contains the shortcut to be displayed.

    The shortcut should communicate the keyboard equivalent to the user.

    @type String
    @default "shortcut"
    @commonTask Menu Item Properties
  */
  itemShortCutKey: 'shortcut',

  /**
    The name of the property that contains the key equivalent of the menu
    item.

    The action of the menu item will be fired, and the menu pane's
    @selectedItem@ property set to the menu item, if the user presses this
    key combination on the keyboard.

    @type String
    @default "keyEquivalent"
    @commonTask Menu Item Properties
  */
  itemKeyEquivalentKey: 'keyEquivalent',

  /**
    The name of the property that determines whether menu flash should be
    disabled.

    When you click on a menu item, it will flash several times to indicate
    selection to the user. Some browsers block windows from opening outside of
    a mouse event, so you may wish to disable menu flashing if the action of
    the menu item should open a new window.

    @type String
    @default "disableMenuFlash"
    @commonTask Menu Item Properties
  */
  itemDisableMenuFlashKey: 'disableMenuFlash',

  /**
    The array of keys used by SC.MenuItemView when inspecting your menu items
    for display properties.

    @private
    @isReadOnly
    @property Array
  */
  menuItemKeys: 'itemTitleKey itemValueKey itemIsEnabledKey itemIconKey itemSeparatorKey itemActionKey itemCheckboxKey itemShortCutKey itemBranchKey itemHeightKey subMenuKey itemKeyEquivalentKey itemTargetKey'.w(),

  // ..........................................................
  // INTERNAL PROPERTIES
  //

  /** @private */
  preferType: SC.PICKER_MENU,

  /**
    Create a modal pane beneath the menu that will prevent any mouse clicks
    that fall outside the menu pane from triggering an inadvertent action.

    @type Boolean
    @private
  */
  isModal: YES,

  /**
    The view that contains the MenuItemViews that are visible on screen.

    This is created and set in createChildViews.

    @property SC.View
    @private
  */
  _menuView: null,

  // ..........................................................
  // INTERNAL METHODS
  //

  /**
    Creates the child scroll view, and sets its contentView to a new
    view.  This new view is saved and managed by the SC.MenuPane,
    and contains the visible menu items.

    @private
    @returns {SC.View} receiver
  */
  createChildViews: function() {
    var scroll, menuView, menuItemViews;

    scroll = this.createChildView(SC.MenuScrollView, {
      borderStyle: SC.BORDER_NONE
    });

    menuView = this._menuView = SC.View.create();
    menuItemViews = this.get('menuItemViews');
    menuView.set('layout', { top: 0, left: 0, height : this.get('menuHeight')});
    menuView.replaceAllChildren(menuItemViews);
    scroll.set('contentView', menuView);

    this.childViews = [scroll];

    return this;
  },

  /**
    The array of child menu item views that compose the menu.

    This computed property parses @displayItems@ and constructs an SC.MenuItemView (or whatever class you have set as the @exampleView@) for every item.

    @property
    @type Array
    @readOnly
  */
  menuItemViews: function() {
    var views = [], items = this.get('displayItems'),
        exampleView = this.get('exampleView'), item, view,
        height, heightKey, separatorKey, defaultHeight, separatorHeight,
        menuHeight, menuHeightPadding, keyEquivalentKey, keyEquivalent,
        keyArray, idx,
        len;

    if (!items) return views; // return an empty array

    heightKey = this.get('itemHeightKey');
    separatorKey = this.get('itemSeparatorKey');
    defaultHeight = this.get('itemHeight');
    keyEquivalentKey = this.get('itemKeyEquivalentKey');
    separatorHeight = this.get('itemSeparatorHeight');

    menuHeightPadding = Math.floor(this.get('menuHeightPadding')/2);
    menuHeight = menuHeightPadding;

    keyArray = this.menuItemKeys.map(SC._menu_fetchKeys, this);

    len = items.get('length');
    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      height = item.get(heightKey);
      if (!height) {
        height = item.get(separatorKey) ? separatorHeight : defaultHeight;
      }
      view = this._menuView.createChildView(exampleView, {
        layout: { height: height, top: menuHeight },
        contentDisplayProperties: keyArray,
        content: item,
        parentMenu: this
      });
      views[idx] = view;
      menuHeight += height;

      keyEquivalent = item.get(keyEquivalentKey);
      if (keyEquivalent) {
        this._keyEquivalents[keyEquivalent] = view;
      }
    }

    this.set('menuHeight', menuHeight+menuHeightPadding);
    return views;
  }.property('displayItems').cacheable(),

  /**
    Returns the menu item view for the content object at the specified index.

    @param {Number} idx the item index
    @returns {SC.MenuItemView} instantiated view
  */
  menuItemViewForContentIndex: function(idx) {
    var menuItemViews = this.get('menuItemViews');

    if (!menuItemViews) return undefined;
    return menuItemViews.objectAt(idx);
  },

  /**
    An associative array of the shortcut keys. The key is the shortcut in the
    form 'ctrl_z', and the value is the menu item of the action to trigger.

    @private
  */
  _keyEquivalents: { },

  /**
    If this is a submenu, this property corresponds to the
    top-most parent menu. If this is the root menu, it returns
    itself.

    @type SC.MenuPane
    @isReadOnly
    @property
  */
  rootMenu: function() {
    if (this.get('isSubMenu')) return this.getPath('parentMenu.rootMenu');
    return this;
  }.property('isSubMenu').cacheable(),

  /**
    Close the menu if the user resizes the window.

    @private
  */
  windowSizeDidChange: function(oldSize, newSize) {
    this.remove();
    return sc_super();
  },

  /**
    Returns an array of normalized display items.

    Because the items property can be provided as either an array of strings,
    or an object with key-value pairs, or an exotic mish-mash of both, we need
    to normalize it for our display logic.

    If an @items@ member is an object, we can assume it is formatted properly
    and leave it as-is.

    If an @items@ member is a string, we create a hash with the title value
    set to that string, and some sensible defaults for the other properties.

    As a last resort, if an @items@ member is an array, we have a legacy
    handler that converts the array into a hash. This behavior is deprecated
    and is not guaranteed to be supported in the future.

    A side effect of running this computed property is that the menuHeight
    property is updated.

    @displayItems@ should never be set directly; instead, set @items@ and
    @displayItems@ will update automatically.

    @property
    @type Array
    @isReadOnly
  */
  displayItems: function() {
    var items = this.get('items'), localize = this.get('localize'),
        itemHeight = this.get('itemHeight'), len,
        ret = [], idx, item, itemType;

    if (!items) return null;

    len = items.get('length');

    // Loop through the items property and transmute as needed, then
    // copy the new objects into the ret array.
    for (idx = 0; idx < len; idx++) {
      item = items.objectAt(idx) ;

      // fast track out if we can't do anything with this item
      if (!item) continue;

      itemType = SC.typeOf(item);
      if (itemType === SC.T_STRING) {
        item = SC.Object.create({ title: item,
                                  value: item,
                                  isEnabled: YES
                               });
      } else if (itemType === SC.T_HASH) {
        item = SC.Object.create(item);
      } else if (itemType === SC.T_ARRAY) {
        item = this.convertArrayMenuItemToObject(item);
      }
      item.contentIndex = idx;

      ret.push(item);
    }

    return ret;
  }.property('items').cacheable(),

  _sc_menu_itemsDidChange: function() {
    var views = this.get('menuItemViews');
    this._menuView.replaceAllChildren(views);
    this._menuView.adjust('height', this.get('menuHeight'));
  }.observes('items'),

  /**
    Takes an array of values and places them in a hash that can be used
    to render a menu item.

    The mapping goes a little something like this:
    0: title
    1: value
    2: isEnabled
    3: icon
    4: isSeparator
    5: action
    6: isCheckbox
    7: isShortCut
    8: isBranch
    9: itemHeight
    10: subMenu
    11: keyEquivalent
    12: target

    @private
  */
  convertArrayMenuItemToObject: function(item) {
    SC.Logger.warn('Support for Array-based menu items has been deprecated.  Please update your menus to use a hash.');

    var keys, fetchKeys = SC._menu_fetchKeys,
        fetchItem = SC._menu_fetchItem, cur, ret = SC.Object.create(), idx, loc;

    // Gets an array of all of the value keys
    keys = this.menuItemKeys.map(fetchKeys, this);

    // title
    ret[keys[0]] = item[0];
    ret[keys[1]] = item[1];
    ret[keys[2]] = item[2];
    ret[keys[3]] = item[3];
    ret[keys[4]] = item[4];
    ret[keys[5]] = item[5];
    ret[keys[6]] = item[6];
    ret[keys[7]] = item[7];
    ret[keys[8]] = item[8];
    ret[keys[9]] = item[9];
    ret[keys[10]] = item[10];
    ret[keys[11]] = item[11];
    ret[keys[12]] = item[12];

    return ret;
  },

  currentMenuItem: function(key, value) {
    if (value !== undefined) {
      if (this._currentMenuItem !== null) {
        this.set('previousMenuItem', this._currentMenuItem);
      }
      this._currentMenuItem = value;
      this.setPath('rootMenu.targetMenuItem', value);

      return value;
    }

    return this._currentMenuItem;
  }.property().cacheable(),

  _sc_menu_currentMenuItemDidChange: function() {
    var currentMenuItem = this.get('currentMenuItem'),
        previousMenuItem = this.get('previousMenuItem');

    if (previousMenuItem) {
      if (previousMenuItem.get('hasSubMenu') && currentMenuItem === null) {

      } else {
        previousMenuItem.resignFirstResponder();
        this.closeOpenMenusFor(previousMenuItem);
      }
    }

    if (currentMenuItem && currentMenuItem.get('isEnabled') && !currentMenuItem.get('isSeparator')) {
     currentMenuItem.becomeFirstResponder();
    }
  }.observes('currentMenuItem'),

  closeOpenMenusFor: function(menuItem) {
    if (!menuItem) return;

    var menu = menuItem.get('parentMenu');

    // Close any open menus if a root menu changes
    while (menu && menuItem) {
      menu = menuItem.get('subMenu');
      if (menu) {
        menu.remove();
        menuItem.resignFirstResponder();
        menuItem = menu.get('previousMenuItem');
      }
    }
  },

  closeOpenMenus: function() {
    this.closeOpenMenusFor(this.get('previousMenuItem'));
  },

  //Mouse and Key Events

  /** @private */
  mouseDown: function(evt) {
    this.modalPaneDidClick();
    return YES ;
  },

  keyUp: function(evt) {
    var ret = this.interpretKeyEvents(evt) ;
    return !ret ? NO : ret ;
  },

  /**
    Selects the next enabled menu item above the currently
    selected menu item when the up-arrow key is pressed.

    @private
  */
  moveUp: function() {
    var currentMenuItem = this.get('currentMenuItem'),
        items = this.get('menuItemViews'),
        currentIndex, parentMenu, idx;

    if (!currentMenuItem) {
      idx = items.get('length')-1;
    } else {
      currentIndex = currentMenuItem.getPath('content.contentIndex');
      if (currentIndex === 0) return YES;
      idx = currentIndex-1;
    }

    while (idx >= 0) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        break;
      }
      idx--;
    }

    return YES;
  },

  /**
    Selects the next enabled menu item below the currently
    selected menu item when the down-arrow key is pressed.

    @private
  */
  moveDown: function() {
    var currentMenuItem = this.get('currentMenuItem'),
        items = this.get('menuItemViews'),
        len = items.get('length'),
        currentIndex, parentMenu, idx;

    if (!currentMenuItem) {
      idx = 0;
    } else {
      currentIndex = currentMenuItem.getPath('content.contentIndex');
      if (currentIndex === len) return YES;
      idx = currentIndex+1;
    }

    while (idx < len) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        break;
      }
      idx++;
    }

    return YES;
  },

  insertText: function(chr, evt) {
    var timer = this._timer, keyBuffer = this._keyBuffer;

    if (timer) {
      timer.invalidate();
    }
    timer = this._timer = SC.Timer.schedule({
      target: this,
      action: 'clearKeyBuffer',
      interval: 500,
      isPooled: NO
    });

    keyBuffer = keyBuffer || '';
    keyBuffer += chr.toUpperCase();

    this.selectMenuItemForString(keyBuffer);
    this._keyBuffer = keyBuffer;

    return YES;
  },

  performKeyEquivalent: function(keyEquivalent) {
    var menuItem = this._keyEquivalents[keyEquivalent];

    if (menuItem) {
      menuItem.performAction(YES);
      return YES;
    }
    return NO;
  },

  selectMenuItemForString: function(buffer) {
    var items = this.get('menuItemViews'), item, title, idx, len, bufferLength;
    if (!items) return;

    bufferLength = buffer.length;
    len = items.get('length');
    for (idx = 0; idx < len; idx++) {
      item = items.objectAt(idx);
      title = item.get('title');

      if (!title) continue;

      title = title.replace(/ /g,'').substr(0,bufferLength).toUpperCase();
      if (title === buffer) {
        this.set('currentMenuItem', item);
        break;
      }
    }
  },

  /**
    Clear the key buffer if the user does not enter any text after a certain
    amount of time.

    This is called by the timer created in the insertText method.

    @private
  */
  clearKeyBuffer: function() {
    this._keyBuffer = '';
  },

  /**
    Close the menu and any open submenus if the user clicks outside the menu.

    Because only the root-most menu has a modal pane, this will only ever get
    called once.

    @returns Boolean
    @private
  */
  modalPaneDidClick: function(evt) {
    this.closeOpenMenusFor(this.get('previousMenuItem'));
    this.remove();

    return YES;
  }
});

SC._menu_fetchKeys = function(k) {
  return this.get(k) ;
};
SC._menu_fetchItem = function(k) {
  if (!k) return null ;
  return this.get ? this.get(k) : this[k] ;
};
