Feature: order middlewares new converter

Background:
  Given a loader "load(a&b)" that provides ["a", "b"]
  And a loader "load(c)" that provides ["c"]
  And a permission "can(b,c)" that requires ["b","c"]
  And a endpoint description "description"
  And an endpoint schema object "schema"
  And a common middleware "middleware"

Scenario: loader order ok
  When new ordering ["load(c)", "load(a&b)", "can(c,b)"] with { "warnOrdering": true }
  Then the ordering resulted ok

Scenario: loader order not ok
  When new ordering ["load(c)", "can(c,b)", "load(a&b)"] with { "warnOrdering": true }
  Then the ordering resulted with error

Scenario: loader ordering ok in a more complex case
  When new ordering ["description", "schema", "load(a&b)", "load(c)", "can(b,c)", "middleware"] with { "warnOrdering": true }
  Then the ordering resulted ok

Scenario: loader ordering not ok in a more complex case
  When new ordering ["load(c)", "schema", "can(c,b)", "description", "middleware", "load(c)", "load(a&b)"] with { "warnOrdering": true }
  Then the ordering resulted with error

