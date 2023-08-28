Feature: analyze feature for docs generation / or other purposes

Scenario: analyze basic app
  Given a basic app
  When analyzing the current app
  Then the analyzed routes includes
    """
    {
      "method": "get",
      "path": "/async-with-stuff/:name"
    }
    """
  And the analyzed routes includes
    """
    {
      "method": "get",
      "path": "/async/:name"
    }
    """
  And the analyzed routes includes
    """
    {
      "method": "get",
      "path": "/not-json/:name"
    }
    """
  And the analyzed routes includes
    """
    {
      "method": "get",
      "path": "/sync/:name"
    }
    """

Scenario: analyze advanced app succeeds
  Given an advanced app
  When analyzing the current app
  Then the analyzed routes at length is 17