// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

"import package core_test";
var SC = require('index');

var parent, store, child, storeKey, json;
module("SC.NestedStore#commitChangesFromNestedStore", {
  setup: function() {
    parent = SC.Store.create();
    
    json = {
      string: "string",
      number: 23,
      bool:   true
    };
    
    storeKey = SC.Store.generateStoreKey();

    store = parent.chain();
    child = store.chain();  // test multiple levels deep

    // wirte basic status
    child.writeDataHash(storeKey, json, SC.Record.READY_DIRTY);
    child.dataHashDidChange(storeKey);
    child.changelog = SC.Set.create();
    child.changelog.add(storeKey);
  }
});

test("copies changed data hashes, statuses, and revisions", function() {
  
  SC.RunLoop.begin();
  
  // verify preconditions
  equals(store.readDataHash(storeKey), undefined, 'precond - should not have data yet');
  ok(child.chainedChanges.contains(storeKey), 'precond - child changes should include storeKey');
  
  // perform action
  equals(store.commitChangesFromNestedStore(child, child.chainedChanges, false), store, 'should return receiver');
  SC.RunLoop.end();
  
  // verify new status
  equals(store.readDataHash(storeKey), json, 'now should have json');
  equals(store.readStatus(storeKey), SC.Record.READY_DIRTY, 'now should have status');
  equals(store.revisions[storeKey], child.revisions[storeKey], 'now shoulave have revision from child');  
    
});

test("adds lock on any items not already locked", function() {

  SC.RunLoop.begin();

  var storeKey2 = SC.Store.generateStoreKey();
  var json2 = { kind: "json2" };
  
  // verify preconditions
  store.readDataHash(storeKey);
  ok(store.locks[storeKey], 'precond - storeKey should have lock');
  ok(!store.locks[storeKey2], 'precond - storeKey2 should not have lock');
  
  // write another record into child store to commit changes.
  child.writeDataHash(storeKey2, json2, SC.Record.READY_DIRTY);
  child.dataHashDidChange(storeKey2);
  
  var changes = child.chainedChanges ;
  ok(changes.contains(storeKey), 'precond - child.chainedChanges should contain storeKey');
  ok(changes.contains(storeKey2), 'precond - child.chainedChanges should contain storeKey2');
  
  // now commit back to parent
  equals(store.commitChangesFromNestedStore(child, changes, false), store, 'should return reciever');
  SC.RunLoop.end();
  
  // and verify that both have locks
  ok(store.locks[storeKey], 'storeKey should have lock after commit (actual: %@)'.fmt(store.locks[storeKey]));
  ok(store.locks[storeKey2], 'storeKey2 should have lock after commit (actual: %@)'.fmt(store.locks[storeKey2]));
  
});

test("adds items in chainedChanges to reciever chainedChanges", function() {

  SC.RunLoop.begin();

  var key1 = SC.Store.generateStoreKey();

  store.dataHashDidChange(key1);
  
  ok(child.chainedChanges.contains(storeKey), 'precond - child.chainedChanges should contain store key');
  
  equals(store.commitChangesFromNestedStore(child, child.chainedChanges, false), store, 'should return receiver');
  SC.RunLoop.end();

  // changelog should merge nested store & existing
  ok(store.chainedChanges.contains(key1), 'chainedChanges should still contain key1');
  ok(store.chainedChanges.contains(storeKey), 'chainedChanges should also contain storeKey');
});

test("should set hasChanges to true if has changes", function() {
  
  SC.RunLoop.begin();
  
  var changes = child.chainedChanges;
  ok(changes.length>0, 'precond - should have some changes in child');
  equals(store.get('hasChanges'), false, 'precond - store should not have changes');
  
  store.commitChangesFromNestedStore(child, changes, false);
  equals(store.get('hasChanges'), true, 'store should now have changes');
});

test("should set hasChanges to false if no changes", function() {
  
  SC.RunLoop.begin();
  
  child = store.chain() ; // get a new child store
  
  var changes = child.chainedChanges || SC.Set.create();
  ok(!changes || !changes.length, 'precond - should have not have changes in child');
  equals(store.get('hasChanges'), false, 'precond - store should not have changes');
  
  store.commitChangesFromNestedStore(child, changes, false);
  SC.RunLoop.end();
  
  equals(store.get('hasChanges'), false, 'store should NOT now have changes');
});

// ..........................................................
// SPECIAL CASES
// 

test("committing changes should chain back each step", function() {

  SC.RunLoop.begin();

  // preconditions
  equals(child.readDataHash(storeKey), json, 'precond - child should have data');
  equals(store.readDataHash(storeKey), undefined, 'precond - store should not have data');
  equals(parent.readDataHash(storeKey), undefined, 'precond - parent should not have data');
  
  // do commits
  child.commitChanges();

  equals(store.get('hasChanges'), true, 'store should now have changes');
  equals(store.readDataHash(storeKey), json, 'store should now have json');
  
  store.commitChanges();
  equals(store.get('hasChanges'), false, 'store should no longer have changes');
  equals(parent.readDataHash(storeKey), json, 'parent should now have json');
  SC.RunLoop.end();
  
});

plan.run();



