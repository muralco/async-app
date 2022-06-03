Feature: order middlewares

Background:
  Given a loader "load(a)" that provides ["a"]
  And a loader "load(b)" that provides ["b"]
  And a loader "load(c,b)" that provides ["c"] and requires ["b"]
  And a priority loader "priority(a)" that provides ["a"]
  And a permission "can(b)" that requires ["b"]
  And a permission "can(c)" that requires ["c"]
  And a permission "can(a,b)" that requires ["a","b"]

Scenario: no order
  When ordering ["load(b)", "can(b)", "load(a)"]
  Then the order of the middlewares remains unchanged

Scenario: reorder
  When ordering ["load(a)", "load(b)", "can(b)"]
  Then the ordered middlewares are ["load(b)", "can(b)", "load(a)"]

Scenario: no order (loader with requires)
  When ordering ["load(b)", "load(c,b)", "can(c)"]
  Then the order of the middlewares remains unchanged

Scenario: reorder (loader with requires)
  When ordering ["load(c,b)", "can(c)", "load(b)"]
  Then the ordered middlewares are ["load(b)", "load(c,b)", "can(c)"]

Scenario: reorder (loader with requires, permission does not require complex loader)
  When ordering ["load(c,b)", "can(b)", "load(b)"]
  Then the ordered middlewares are ["load(b)", "can(b)", "load(c,b)"]

Scenario: reorder (complex permission)
  When ordering ["can(a,b)", "load(b)", "load(a)"]
  Then the ordered middlewares are ["load(a)", "load(b)", "can(a,b)"]

Scenario: priority will be pulled to the beginning (no order)
  When ordering ["priority(a)", "load(b)", "can(b)"]
  Then the order of the middlewares remains unchanged

Scenario: priority will be pulled to the beginning (reorder)
  When ordering ["load(b)", "can(b)", "priority(a)"]
  Then the ordered middlewares are ["priority(a)", "load(b)", "can(b)"]

Scenario: priority is also provider for complex permission (no order)
  When ordering ["priority(a)", "load(b)", "can(a,b)"]
  Then the order of the middlewares remains unchanged

Scenario: priority is also provider for complex permission (reorder)
  When ordering ["priority(a)", "can(a,b)", "load(b)"]
  Then the ordered middlewares are ["priority(a)", "load(b)", "can(a,b)"]
