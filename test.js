'use strict';

require('isomorphic-fetch');

const expect = require('chai').expect;
const fetchMock = require('fetch-mock/src/server');
const fetchAll = require('./index');

describe('fetch all', () => {

	afterEach(() => fetchMock.restore());

	it('terminate if no link header', () => {
		fetchMock.mock('http://domain.com', [{id:1}, {id:2}]);
		return fetchAll('http://domain.com')
			.then(res => {
				expect(res.length).to.equal(1);
				return res[0].json()
					.then(arr => {
						expect(arr).to.deep.equal([{id:1}, {id:2}])
					})
			})

	});

	it('terminate if no link next', () => {
		fetchMock.mock('http://domain.com', {
			body: [{id:1}, {id:2}],
			headers: {
				'Link': ''
			}
		});
		return fetchAll('http://domain.com')
			.then(res => {
				expect(res.length).to.equal(1);
				return res[0].json()
					.then(arr => {
						expect(arr).to.deep.equal([{id:1}, {id:2}])
					})
			})
	});

	it('follow link next until end', () => {
		fetchMock.mock([{
			name: 'first',
			matcher: 'http://domain.com',
			response: {
				body: [{id:1}, {id:2}],
				headers: {
					'Link': '<http://domain.com?page=2>; rel="next"'
				}
			}
		}, {
			name: 'second',
			matcher: 'http://domain.com?page=2',
			response: {
				body: [{id:3}, {id:4}],
				headers: {
					'Link': '<http://domain.com?page=3>; rel="next", <http://domain.com?page=1>; rel="prev"'
				}
			}
		}, {
			name: 'third',
			matcher: 'http://domain.com?page=3',
			response: {
				body: [{id:5}, {id:6}],
				headers: {
					'Link': '<http://domain.com?page=2>; rel="prev"'
				}
			}
		}]);
		return fetchAll('http://domain.com')
			.then(res => {
				expect(res.length).to.equal(3);
				expect(fetchMock.calls('first').length).to.equal(1);
				expect(fetchMock.calls('second').length).to.equal(1);
				expect(fetchMock.calls('third').length).to.equal(1);
				return Promise.all(res.map(res => res.json()))
					.then(arr => {
						expect(arr[0]).to.deep.equal([{id:1}, {id:2}])
						expect(arr[1]).to.deep.equal([{id:3}, {id:4}])
						expect(arr[2]).to.deep.equal([{id:5}, {id:6}])
					})
			})
	});

	it('fail on first error', () => {
		fetchMock.mock([{
			name: 'first',
			matcher: 'http://domain.com',
			response: {
				body: [{id:1}, {id:2}],
				headers: {
					'Link': '<http://domain.com?page=2>; rel="next"'
				}
			}
		}, {
			name: 'second',
			matcher: 'http://domain.com?page=2',
			response: {
				throws: 'An error'
			}
		}]);
		return fetchAll('http://domain.com')
			.catch(err => {
				expect(err).to.equal('An error');
			})
	});

	it('go backwards and forwards when starting in middle', () => {

	});

	it('configure to go backwards only', () => {

	});

	it('configure to go forwards only', () => {

	});

	it('able to set limit to number of requests', () => {

	});

	it('has configuration shorthand for limit', () => {

	})

	it('has configuration shorthand for direction', () => {

	})

	it('has ability to pass in options to fetch', () => {

	})

	it('configure to not fail on first error', () => {

		// need to make sure this does/doesn't terminate bidirectionally

		fetchMock.mock([{
			name: 'first',
			matcher: 'http://domain.com',
			response: {
				body: [{id:1}, {id:2}],
				headers: {
					'Link': '<http://domain.com?page=2>; rel="next"'
				}
			}
		}, {
			name: 'second',
			matcher: 'http://domain.com?page=2',
			response: {
				throws: new Error('An error')
			}
		}]);
		return fetchAll('http://domain.com', {
			failGracefully: true
		})
			.then(res => {
				expect(res[1].message).to.equal('An error');
			})
	});

})
