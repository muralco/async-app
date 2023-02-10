Feature: advanced example

Scenario: create a new user
  When POST /users with payload { "username": "${random}", "name": "John ${random}" }
  Then the response is 201
  And store the response payload in U
  And the document for user U at name is "John ${random}"

Scenario: get user
  Given a user U with { "username": "${random}", "name": "Paul ${random}" }
  When GET /users/${U.username}
  Then the response is 200 and the payload is
    """
    {
      "username": "${random}",
      "name": "Paul ${random}"
    }
    """

Scenario: create TODO
  Given a user U with { "username": "${random}", "name": "George ${random}" }
  When POST /todos/${U.username} with payload { "item": "rock a ${random} stuff" }
  Then the response is 201
  And store the response payload in T
  And the document for todo T includes
    """
    {
      "item": "rock a ${random} stuff"
    }
    """

Scenario: get TODOs
  Given a user U with { "username": "${random}", "name": "Ringo ${random}" }
  And a todo T with { "owner": "${U.username}", "item": "Autograph a photo for Marge" }
  When GET /todos/${U.username}
  Then the response is 200 and the payload includes
    """
    {
      "item": "Autograph a photo for Marge"
    }
    """

Scenario: get TODOs by id
  Given a user U with { "username": "${random}", "name": "Ringo ${random}" }
  And a todo T with { "owner": "${U.username}", "item": "Autograph a photo for Marge" }
  When GET /todos-by-id/${T.id}
  Then the response is 200 and the payload includes
    """
    {
      "item": "Autograph a photo for Marge"
    }
    """

Scenario: delete USER by id
  Given a user U with { "username": "${random}", "name": "Ringo ${random}" }
  When DELETE /users/purge/${U.username}
  Then the response is 200 and the payload includes
    """
    {
      "username": "${U.username}"
    }
    """
  And the user U was deleted

Scenario: do not delete a not existing user and respond with a custom error
  When DELETE /users/purge/${U.username}
  Then the response is 400
  And the response payload at error is "invalid_user"

Scenario: mapAsyncResultFn
  When GET /echo1
  Then the response is 200 and the payload is
    """
    {
      "isAsyncMiddleware": true,
      "isLastMiddleware": true,
      "method": "GET",
      "path": "/echo1"
    }
    """

Scenario: mapAsyncResultFn
  When GET /echo2
  Then the response is 200 and the payload is { "last": true }

Scenario: mapAsyncResultFn
  When GET /echo2?throw=true
  Then the response is 500 and the payload at error is "NOT_LAST"

Scenario: mapAsyncResultFn
  When GET /echo3
  Then the response is 200 and the payload is { "last": true }

Scenario: mapAsyncResultFn
  When GET /echo3?throw=true
  Then the response is 500 and the payload at error is "NOT_ASYNC"

Scenario: CustomResponse isRaw = true, no headers
  When GET /custom-response-raw
  Then the response is 200 and the raw payload is "test"

Scenario: CustomResponse isRaw = false, with headers
  When GET /custom-response-headers
  Then the response is 200 and the raw payload is "\"test\""
  And the response headers at header1 is "header-value"
  And the response headers at header2 is "header-value2, header-value3"

Scenario: NOT CustomResponse with headers prop, should not add headers
  When GET /response-headers
  Then the response is 200
  And the response headers at header1 is undefined
  And the response headers at header2 is undefined

# Edges

Scenario: create a user without username
  When POST /users with payload { "name": "Invalid" }
  Then the response is 400 and the payload includes
    """
    {
      "error": "INVALID_PAYLOAD",
      "path": ["username"]
    }
    """

Scenario: create a user without name
  When POST /users with payload { "username": "Invalid" }
  Then the response is 400 and the payload includes
    """
    {
      "error": "INVALID_PAYLOAD",
      "path": ["name"]
    }
    """

Scenario: custom schema validation error function
  Given the request header x-include-all-schema-errors is "1"
  When POST /users
  Then the response is 400 and the payload includes
    """
    {
      "all": [
        {
          "expected": "string",
          "key": ["name"]
        },
        {
          "expected": "string",
          "key": ["username"]
        }
      ],
      "error": "INVALID_PAYLOAD"
    }
    """

Scenario: get invalid user
  When GET /users/invalid
  Then the response is 404 and the payload at error is "USER"

Scenario: create TODO without item
  Given a user U with { "username": "${random}", "name": "Invalid ${random}" }
  When POST /todos/${random} with payload {}
  Then the response is 400 and the payload includes
    """
    {
      "error": "INVALID_PAYLOAD",
      "path": ["item"]
    }
    """

Scenario: create TODO for an invalid user
  When POST /todos/invalid with payload { "item": "Invalid" }
  Then the response is 404 and the payload at error is "USER"

Scenario: get TODOs for an invalid user
  When GET /todos/invalid
  Then the response is 404 and the payload at error is "USER"

# Deprecated
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

