'use strict';

const parseLink = require('parse-link-header');

class FetchAll {
	constructor(url, options) {
		options = options || {};
		this.fetchOptions = options.fetch;
		this.limit = typeof options === 'number' && options || typeof options === 'object' && options.limit;
		this.initialDirection = typeof options === 'string' && options || typeof options === 'object' && options.direction;
		this.prevTerminated = this.initialDirection === 'next';
		this.nextTerminated = this.initialDirection === 'prev';
		this.failGracefully = options.failGracefully;
		this.initialUrl = url;
		this.promises = [];
	}

	exec () {
		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
			this.fetch(this.initialUrl, this.initialDirection)
		})
	}

	fetch (url, direction) {
		const request = fetch(url, this.fetchOptions)

		this.promises[direction === 'next' ? 'push' : 'unshift'](request);

		if (this.limit && this.promises.length >= this.limit) {
			return this.end();
		}

		request
			.then(res => {

				const link = parseLink(res.headers.get('Link')) || {};

				if (!link.prev) {
					this.prevTerminated = true;
				}

				if (!link.next) {
					this.nextTerminated = true;
				}

				if (this.nextTerminated && this.prevTerminated) {
					return this.end();
				}

				if (link.next && (direction === 'next' || !direction)) {
					this.fetch(link.next.url, 'next');
				}

				if (link.prev && (direction === 'prev' || !direction)) {
					this.fetch(link.prev.url, 'prev');
				}
			})
			.catch(err => {
				if (this.failGracefully) {
					this.promises = this.promises.map(r => {
						if (r === request) {
							return r.catch(err => err);
						}
						return r;
					})
					this.end();
				} else {
					this.reject(err);
				}
			});
	}

	end () {
		this.resolve(Promise.all(this.promises));
	}
}

function fetchAll(url, options) {
	return new FetchAll(url, options).exec();
}

module.exports = fetchAll;