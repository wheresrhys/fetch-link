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

				if ((!direction || direction === 'next') && link.next) {
					this.fetch(link.next.url, 'next');
				}

				if ((!direction || direction === 'prev') && link.prev) {
					this.fetch(link.prev.url, 'prev');
				}
			})
			.catch(this.reject);
	}

	end () {
		this.resolve(Promise.all(this.promises));
	}
}

function fetchAll(url, options) {
	return new FetchAll(url, options).exec();
}

module.exports = fetchAll;