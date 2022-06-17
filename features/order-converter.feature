Feature: order middlewares new converter

Background:
  Given a loader "load(a&b)" that provides ["a", "b"]
  And a loader "load(c)" that provides ["c"]
  And a permission "can(b,c)" that requires ["b","c"]
  And a permission "can(c,b)" that requires ["c", "b"]
  And a endpoint description "description"
  And an endpoint schema object "schema"
  And a common middleware "middleware"

Scenario Outline: loader order not changing even if can definition is different
  When new ordering ["load(c)", "load(a&b)", "can(<param order>)"]
  Then the order of the middlewares remains unchanged

  Examples:
    | param order |
    | b,c         |
    | c,b         |

Scenario Outline: loader order changing using legacy converter
  When legacy ordering ["load(c)", "load(a&b)", "can(<param order>)"]
  Then the ordered middlewares are <resulting order>

  Examples:
    | param order | resulting order                      |
    | b,c         | ["load(a&b)", "load(c)", "can(b,c)"] |
    | c,b         | ["load(c)", "load(a&b)", "can(c,b)"] |

Scenario Outline: loader order changing using new converter with legacy option
  When new ordering ["load(c)", "load(a&b)", "can(<param order>)"] with { "noStableSort": true }
  Then the ordered middlewares are <resulting order>

  Examples:
    | param order | resulting order                      |
    | b,c         | ["load(a&b)", "load(c)", "can(b,c)"] |
    | c,b         | ["load(c)", "load(a&b)", "can(c,b)"] |

Scenario Outline: loader ordering in a more complex case
  When <version> ordering ["load(c)", "schema", "can(<param order>)", "description", "middleware", "load(c)", "load(a&b)"]
  Then the ordered middlewares are ["description", "schema", <resulting order>, "can(<param order>)", "middleware"]

  Examples:
    | version | param order | resulting order        |
    | new     | b,c         | "load(c)", "load(a&b)" |
    | new     | c,b         | "load(c)", "load(a&b)" |
    | legacy  | b,c         | "load(a&b)", "load(c)" |
    | legacy  | c,b         | "load(c)", "load(a&b)" |
