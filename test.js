'use strict';

require('isomorphic-fetch');

const expect = require('chai').expect;
const fetchMock = require('fetch-mock/src/server');
const fetchLinks = require('./index');

describe('fetch links', function () {

	describe('fetch all', () => {

		afterEach(() => fetchMock.restore());

		describe('no-op', function () {
			it('terminate if no link header', () => {
				fetchMock.mock('http://domain.com', [{id:1}, {id:2}]);
				return fetchLinks.all('http://domain.com')
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
				return fetchLinks.all('http://domain.com')
					.then(res => {
						expect(res.length).to.equal(1);
						return res[0].json()
							.then(arr => {
								expect(arr).to.deep.equal([{id:1}, {id:2}])
							})
					})
			});
		});

		describe('error handling', function () {
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
				return fetchLinks.all('http://domain.com')
					.catch(err => {
						expect(err).to.equal('An error');
					})
			});

			it('configure to not fail on first error', () => {
				fetchMock.mock([{
					name: 'first',
					matcher: 'http://domain.com?page=1',
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
						body: [{id:1}, {id:2}],
						headers: {
							'Link': '<http://domain.com?page=3>; rel="next", <http://domain.com?page=1>; rel="prev"'
						}
					}
				}, {
					name: 'third',
					matcher: 'http://domain.com?page=3',
					response: {
						body: [{id:1}, {id:2}],
						headers: {
							'Link': '<http://domain.com?page=4>; rel="next", <http://domain.com?page=2>; rel="prev"'
						}
					}
				}, {
					name: 'fourth',
					matcher: 'http://domain.com?page=4',
					response: {
						throws: new Error('An error')
					}
				}]);
				return fetchLinks.all('http://domain.com?page=3', {
					failGracefully: true
				})
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(4);
						expect(res[3].message).to.equal('An error');
					})
			});
		});

		describe('normal operation', function () {
			beforeEach(() => {
				fetchMock.mock([{
					name: 'first',
					matcher: 'http://domain.com?page=1',
					response: {
						body: {id:1},
						headers: {
							'Link': '<http://domain.com?page=2>; rel="next"'
						}
					}
				}, {
					name: 'second',
					matcher: 'http://domain.com?page=2',
					response: {
						body: {id:2},
						headers: {
							'Link': '<http://domain.com?page=3>; rel="next", <http://domain.com?page=1>; rel="prev"'
						}
					}
				}, {
					name: 'third',
					matcher: 'http://domain.com?page=3',
					response: {
						body: {id:3},
						headers: {
							'Link': '<http://domain.com?page=2>; rel="prev"'
						}
					}
				}]);
			})
			it('follow link next until end', () => {
				return fetchLinks.all('http://domain.com?page=1')
					.then(res => {
						expect(res.length).to.equal(3);
						expect(fetchMock.calls('first').length).to.equal(1);
						expect(fetchMock.calls('second').length).to.equal(1);
						expect(fetchMock.calls('third').length).to.equal(1);
						return Promise.all(res.map(res => res.json()))
							.then(arr => {
								expect(arr).to.deep.equal([{id:1}, {id:2}, {id:3}])
							})
					})
			});

			it('go backwards and forwards when starting in middle', () => {
				return fetchLinks.all('http://domain.com?page=2')
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(3);
						return Promise.all(res.map(r => r.json()))
							.then(res => {
								expect(res).to.deep.equal([{id:1},{id:2},{id:3}]);
							})

					})
			});

			it('configure to go backwards only', () => {
				return fetchLinks.all('http://domain.com?page=2', {
					direction: 'prev'
				})
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(2);
						return Promise.all(res.map(r => r.json()))
							.then(res => {
								expect(res).to.deep.equal([{id:1},{id:2}]);
							})

					})
			});

			it('configure to go forwards only', () => {
				return fetchLinks.all('http://domain.com?page=2', {
					direction: 'next'
				})
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(2);
						return Promise.all(res.map(r => r.json()))
							.then(res => {
								expect(res).to.deep.equal([{id:2},{id:3}]);
							})

					})
			});

			it('able to set limit to number of requests', () => {
				return fetchLinks.all('http://domain.com?page=1', {
					limit: 2
				})
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(2);
						return Promise.all(res.map(r => r.json()))
							.then(res => {
								expect(res).to.deep.equal([{id:1},{id:2}]);
							})

					})
			});

			it('has configuration shorthand for limit', () => {
				return fetchLinks.all('http://domain.com?page=1', 2)
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(2);
						return Promise.all(res.map(r => r.json()))
							.then(res => {
								expect(res).to.deep.equal([{id:1},{id:2}]);
							})

					})
			})

			it('has configuration shorthand for direction', () => {
				return fetchLinks.all('http://domain.com?page=2', 'prev')
					.then(res => {
						// should continue to fetch in the direction unaffected by the error
						expect(res.length).to.equal(2);
						return Promise.all(res.map(r => r.json()))
							.then(res => {
								expect(res).to.deep.equal([{id:1},{id:2}]);
							})
					})
			})

			it('has ability to pass in options to fetch', () => {
				return fetchLinks.all('http://domain.com?page=1', {
					fetch: {
						method: 'POST'
					}
				})
					.then(res => {
						expect(fetchMock.calls('first')[0][1].method).to.equal('POST');
						expect(fetchMock.calls('second')[0][1].method).to.equal('POST');
						expect(fetchMock.calls('third')[0][1].method).to.equal('POST');
					})
			})
		})
	})

	describe('non iterators', function () {
		// awaiting v2.2.1 of isomorphic fetch in order to expose the Response constructor and facilitate writing the test for these
	})
})