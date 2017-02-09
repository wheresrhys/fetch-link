#fetch-link

Extension of fetch to recursively fetch resources using the Link header

## API

# `next`, `prev`, `first`, `last`
Methods that will fetch the given linked resource if specified in the 'Link' header. Each function accepts two parameters `(res, options)` and returns a promise for a `Response`
 - `res` Either a `Response` instance or the value of the `Link` header extracted from a `Response` object
 - `options` object to pass in to the fetch request for th elinked resource

# `all(url, options)`
Recursively fetches all linked resources, beginning with the given url. Returns a promise for an array of `Response` instances
- `url` The url to fetch
- `options` Object to configure requests and recursive behaviour. Accepts the following properties (all optional)
    - `fetch` An object that will be passed as the optiosn to every fetch request sent. Can also be  afunction, expecting `url` as the first parameter, and returning an optiosn object, so that each fetch can be configured independently e.g. send a different `eTag` with each fetch
    - `direction` 'next' or 'prev', indicating which direction to follow links in (default is to follow both 'next' and 'prev')
    - `limit` maximum number of links to follow. Note that the behaviour when specifying `limit` and not specifying `direction` is not guaranteed to produce the same results every time because e.g. a single slow response in the 'next' direction can result in requests being weighted towards the 'prev' direction
    - `failGracefully` By default a single failed response will cause `all()` to reject with the error thrown. If `failGracefully` is true then it will continue to follow links in the opposite direction to the one which has errored and eventually resolve with a promise for an array of responses with the error returned in the first/last place. This only applies to javascript errors thrown by fetch; http errors (503 etc) count as succesful responses and if the response specifies a Link header then it will be followed as normal.

# `setFetchImplementation(func)`
Use a custom implementation of `fetch`
