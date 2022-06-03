Feature: Deprecate methods to apply to middlewares

Scenario: deprecate.endpoint
  When GET /deprecated
  Then the response is 200
  And the response headers at deprecated is "true"

Scenario: deprecate.for
  When GET /deprecated-for
  Then the response is 200
  And the response headers at deprecated-for is "GET /not-deprecated"

Scenario: deprecate.endpoint get user
  Given a user U with { "username": "${random}", "name": "Paul ${random}" }
  When GET /deprecated/user/${U.username}
  Then the response is 200 and the payload is
    """
    {
      "username": "${random}",
      "name": "Paul ${random}"
    }
    """
  And the response headers at deprecated-for is "GET /users/${U.username}"

Scenario: deprecate.rewrite get todos
  Given a user U with { "username": "${random}", "name": "Ringo ${random}" }
  And a todo T with { "owner": "${U.username}", "item": "Autograph a photo for Marge" }
  When GET /deprecated/todos/${U.username}
  Then the response is 302
  And the response headers at deprecated-for is "GET /todos/${U.username}"
  And the response headers at location contains "/todos/${U.username}"

