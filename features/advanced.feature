Feature: advanced example

Scenario: create a new user
  When POST /users with payload { "username": "${random}", "name": "John ${random}" }
  Then the response is 201
  And the DB at users.${random}.name is "John ${random}"

Scenario: get user
  Given a user "${random}" named "Paul ${random}"
  When GET /users/${random}
  Then the response is 200 and the payload is
    """
    {
      "username": "${random}",
      "name": "Paul ${random}"
    }
    """

Scenario: create TODO
  Given a user "${random}" named "George ${random}"
  When POST /todos/${random} with payload { "item": "rock a ${random} stuff" }
  Then the response is 201
  And the DB at todos.${random} includes
    """
    {
      "item": "rock a ${random} stuff"
    }
    """

Scenario: get TODOs
  Given a user "${random}" named "Ringo ${random}"
  And a TODO for user "${random}" with "Autograph a photo for Marge"
  When GET /todos/${random}
  Then the response is 200 and the payload includes
    """
    {
      "item": "Autograph a photo for Marge"
    }
    """

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

Scenario: get invalid user
  When GET /users/invalid
  Then the response is 404

Scenario: create TODO without item
  Given a user "${random}" named "Invalid ${random}"
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
  Then the response is 404

Scenario: get TODOs for an invalid user
  When GET /todos/invalid
  Then the response is 404
